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

let cachedRecognizer: { modelId: string; recognizer: unknown } | null = null;

export async function transcribeLocal(o: LocalTranscribeOptions): Promise<string> {
  const { getModelFiles, LOCAL_MODELS } = await import('./localModels');
  const modelDef = LOCAL_MODELS.find((m) => m.id === o.model);
  if (!modelDef) throw new Error(`Unknown model: ${o.model}`);

  const files = getModelFiles(o.model);
  if (!files) throw new Error(`Model "${modelDef.name}" not downloaded. Open Voice settings to download it.`);

  o.onProgress?.('Loading model...');

  const sherpa = await import('sherpa-onnx-node') as any;

  if (!cachedRecognizer || cachedRecognizer.modelId !== o.model) {
    let config: any;

    if (modelDef.engine === 'sherpa-whisper') {
      const encoder = Object.entries(files).find(([k]) => k.includes('encoder'))?.[1];
      const decoder = Object.entries(files).find(([k]) => k.includes('decoder'))?.[1];
      const tokens = Object.entries(files).find(([k]) => k.includes('tokens'))?.[1];
      config = {
        featConfig: { sampleRate: 16000, featureDim: 80 },
        modelConfig: {
          whisper: { encoder, decoder },
          tokens,
          numThreads: 2,
          provider: 'cpu',
        },
        decodingMethod: 'greedy_search',
      };
    } else if (modelDef.engine === 'sherpa-paraformer') {
      const model = Object.entries(files).find(([k]) => k.includes('model'))?.[1];
      const tokens = Object.entries(files).find(([k]) => k.includes('tokens'))?.[1];
      config = {
        featConfig: { sampleRate: 16000, featureDim: 80 },
        modelConfig: {
          paraformer: { model },
          tokens,
          numThreads: 2,
          provider: 'cpu',
        },
        decodingMethod: 'greedy_search',
      };
    } else if (modelDef.engine === 'sherpa-nemo') {
      const encoder = Object.entries(files).find(([k]) => k.includes('encoder'))?.[1];
      const decoder = Object.entries(files).find(([k]) => k.includes('decoder'))?.[1];
      const joiner = Object.entries(files).find(([k]) => k.includes('joiner'))?.[1];
      const tokens = Object.entries(files).find(([k]) => k.includes('tokens'))?.[1];
      config = {
        featConfig: { sampleRate: 16000, featureDim: 80 },
        modelConfig: {
          transducer: { encoder, decoder, joiner },
          tokens,
          numThreads: 2,
          provider: 'cpu',
          modelType: 'nemo_transducer',
        },
        decodingMethod: 'modified_beam_search',
      };
    }

    const recognizer = new sherpa.OfflineRecognizer(config);
    cachedRecognizer = { modelId: o.model, recognizer };
  }

  o.onProgress?.('Transcribing...');

  const recognizer = cachedRecognizer.recognizer as any;
  const stream = recognizer.createStream();
  stream.acceptWaveform({ sampleRate: 16000, samples: o.pcm });
  recognizer.decode(stream);
  const result = recognizer.getResult(stream);
  return (result.text ?? '').trim();
}

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}
