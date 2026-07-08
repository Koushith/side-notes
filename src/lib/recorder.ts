// Microphone capture for voice dictation. Records to a compressed blob (sent to
// cloud STT as-is) and exposes a live input level for the waveform UI. For the
// local engine we also decode the blob to mono 16 kHz PCM — the sample format
// every Whisper variant expects.

export interface Recording {
  blob: Blob;
  mimeType: string;
}

export interface RecorderHandle {
  /** Current input level, 0..1, sampled from an analyser. Drives the waveform. */
  level: () => number;
  /** Frequency band levels (0..1) for visualization. Returns an array of normalized amplitudes. */
  frequencies: (bandCount: number) => number[];
  /** Stop and resolve with the captured audio. */
  stop: () => Promise<Recording>;
  /** Abort without producing a recording (releases the mic). */
  cancel: () => void;
}

function pickMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export async function startRecording(): Promise<RecorderHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  // Analyser for the live level meter — separate from the recorder graph.
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.6;
  source.connect(analyser);
  const buf = new Uint8Array(analyser.fftSize);
  const freqBuf = new Uint8Array(analyser.frequencyBinCount);

  recorder.start();

  const teardown = () => {
    stream.getTracks().forEach((t) => t.stop());
    audioCtx.close().catch(() => {});
  };

  return {
    level() {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      return Math.min(1, Math.sqrt(sum / buf.length) * 3);
    },
    frequencies(bandCount: number) {
      analyser.getByteFrequencyData(freqBuf);
      const bands: number[] = [];
      const binCount = freqBuf.length;
      const binsPerBand = Math.floor(binCount / bandCount);
      for (let b = 0; b < bandCount; b++) {
        let sum = 0;
        const start = b * binsPerBand;
        const end = Math.min(start + binsPerBand, binCount);
        for (let i = start; i < end; i++) {
          sum += freqBuf[i];
        }
        bands.push(Math.min(1, (sum / (end - start)) / 180));
      }
      return bands;
    },
    stop() {
      return new Promise<Recording>((resolve) => {
        recorder.onstop = () => {
          teardown();
          resolve({ blob: new Blob(chunks, { type: mimeType || 'audio/webm' }), mimeType: mimeType || 'audio/webm' });
        };
        recorder.stop();
      });
    },
    cancel() {
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
      teardown();
    },
  };
}

/** A tiny valid 16 kHz mono WAV of silence — used to probe a cloud STT endpoint
 *  (validates base URL + key + model without needing the user to speak). */
export function silentWav(seconds = 0.25): ArrayBuffer {
  const rate = 16000;
  const samples = Math.floor(rate * seconds);
  const buf = new ArrayBuffer(44 + samples * 2);
  const dv = new DataView(buf);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  dv.setUint32(4, 36 + samples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  dv.setUint32(16, 16, true); // PCM chunk size
  dv.setUint16(20, 1, true); // PCM
  dv.setUint16(22, 1, true); // mono
  dv.setUint32(24, rate, true);
  dv.setUint32(28, rate * 2, true); // byte rate
  dv.setUint16(32, 2, true); // block align
  dv.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  dv.setUint32(40, samples * 2, true);
  // sample data left as zeros (silence)
  return buf;
}

/** Decode a recorded blob to mono 16 kHz PCM for the local Whisper engine. */
export async function decodeToPcm16k(blob: Blob): Promise<Float32Array> {
  const arrayBuf = await blob.arrayBuffer();
  // A throwaway context just to decode; sample rate here doesn't matter, we
  // resample below via OfflineAudioContext.
  const decodeCtx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuf);
  } finally {
    decodeCtx.close().catch(() => {});
  }

  const targetRate = 16000;
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * targetRate), targetRate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0).slice();
}
