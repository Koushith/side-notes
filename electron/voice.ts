// Speech-to-text. Lives in the main process for the same reasons as ai.ts: the
// API key never reaches the renderer, and we sidestep the renderer's strict
// `connect-src 'self'` CSP. Two engines behind one shape:
//
//   • cloud — multipart POST to an OpenAI-compatible /audio/transcriptions
//     endpoint. Works with OpenAI (whisper-1, gpt-4o-transcribe) and, by editing
//     the base URL, Groq (whisper-large-v3-turbo), etc.
//   • local — Transformers.js whisper running on the CPU/GPU via onnxruntime.
//     The heavy dep (@huggingface/transformers) is imported lazily so the app
//     still builds and the cloud engine still works when it isn't installed.

export interface CloudTranscribeOptions {
  /** OpenAI-compatible base, already including the /v1 suffix. */
  baseUrl: string;
  apiKey: string;
  model: string;
  /** ISO-639-1 hint, e.g. "en". Empty = auto-detect. */
  language?: string;
  /** Vocabulary / proper-noun bias — Whisper's `prompt` param. */
  prompt?: string;
  /** Encoded audio bytes (webm/opus from MediaRecorder). */
  audio: Uint8Array;
  mimeType: string;
  signal: AbortSignal;
}

export async function transcribeCloud(o: CloudTranscribeOptions): Promise<string> {
  if (!o.apiKey) throw new Error('Speech-to-text API key not set. Add one in Voice settings.');
  if (!o.model) throw new Error('No transcription model selected. Open Voice settings.');

  const ext = o.mimeType.includes('wav')
    ? 'wav'
    : o.mimeType.includes('ogg')
      ? 'ogg'
      : o.mimeType.includes('mp4')
        ? 'mp4'
        : 'webm';
  const form = new FormData();
  // Slice into a fresh ArrayBuffer so Blob never sees a SharedArrayBuffer view.
  const bytes = o.audio.slice();
  form.append('file', new Blob([bytes], { type: o.mimeType }), `audio.${ext}`);
  form.append('model', o.model);
  form.append('response_format', 'json');
  if (o.language) form.append('language', o.language);
  if (o.prompt) form.append('prompt', o.prompt);

  const res = await fetch(`${stripTrailingSlash(o.baseUrl)}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${o.apiKey}` },
    body: form,
    signal: o.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Transcription ${res.status}: ${text || res.statusText}`);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text ?? '').trim();
}

export interface LocalTranscribeOptions {
  model: string;
  language?: string;
  /** Mono 16 kHz PCM samples in [-1, 1], decoded in the renderer. */
  pcm: Float32Array;
  onProgress?: (msg: string) => void;
}

// Cache the loaded pipeline per model (Transformers.js path).
let localPipe: { model: string; run: (audio: Float32Array, opts: Record<string, unknown>) => Promise<{ text: string }> } | null = null;

export async function transcribeLocal(o: LocalTranscribeOptions): Promise<string> {
  // If the model is a ggml model ID (from our catalog), use whisper.cpp subprocess
  if (o.model.startsWith('ggml-')) {
    return transcribeWhisperCpp(o);
  }

  // Fallback: Transformers.js (optional peer dep)
  const pkg = '@huggingface/transformers';
  let transformers: { pipeline: (...args: unknown[]) => Promise<unknown> };
  try {
    transformers = (await import(/* @vite-ignore */ pkg)) as never;
  } catch {
    throw new Error(
      'Local engine not installed. Download a model in Voice settings, or switch to the cloud engine.'
    );
  }

  if (!localPipe || localPipe.model !== o.model) {
    o.onProgress?.('Loading model...');
    const pipe = await transformers.pipeline('automatic-speech-recognition', o.model, {
      progress_callback: (p: { status?: string; progress?: number }) => {
        if (p?.status === 'progress' && typeof p.progress === 'number') {
          o.onProgress?.(`Downloading model ${Math.round(p.progress)}%`);
        }
      },
    });
    localPipe = { model: o.model, run: pipe as never };
  }

  o.onProgress?.('Transcribing...');
  const out = await localPipe.run(o.pcm, {
    chunk_length_s: 30,
    stride_length_s: 5,
    language: o.language || undefined,
    task: 'transcribe',
  });
  return (out.text ?? '').trim();
}

async function transcribeWhisperCpp(o: LocalTranscribeOptions): Promise<string> {
  const { getModelPath } = await import('./whisperModels');
  const modelPath = getModelPath(o.model);
  if (!modelPath) {
    throw new Error(`Model "${o.model}" not downloaded. Open Voice settings to download it.`);
  }

  o.onProgress?.('Preparing audio...');

  // Write PCM to a temp WAV file (whisper.cpp expects 16kHz mono WAV)
  const { app } = await import('electron');
  const { join } = await import('path');
  const { writeFileSync, unlinkSync } = await import('fs');
  const tmpDir = app.getPath('temp');
  const wavPath = join(tmpDir, `sn-voice-${Date.now()}.wav`);

  // Create WAV header + PCM16 data
  const samples = o.pcm;
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(16000, 24); // sample rate
  buffer.writeUInt32LE(32000, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  writeFileSync(wavPath, buffer);

  // Auto-download whisper.cpp binary if not present
  const { isWhisperBinaryInstalled, downloadWhisperBinary, getWhisperBinaryPath } = await import('./whisperModels');

  if (!isWhisperBinaryInstalled()) {
    o.onProgress?.('Setting up whisper engine (one-time)...');
    await downloadWhisperBinary((msg) => o.onProgress?.(msg));
  }

  o.onProgress?.('Transcribing...');

  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);
  const whisperBin = getWhisperBinaryPath();

  try {
    const args = [
      '-m', modelPath,
      '-f', wavPath,
      '--no-timestamps',
      '-l', o.language || 'auto',
    ];
    const { stdout } = await execFileAsync(whisperBin, args, { timeout: 120000 });
    return stdout.trim();
  } finally {
    try { unlinkSync(wavPath); } catch {}
  }
}

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}
