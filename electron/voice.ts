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
  /** A Transformers.js ASR model id, e.g. "Xenova/whisper-base.en". */
  model: string;
  language?: string;
  /** Mono 16 kHz PCM samples in [-1, 1], decoded in the renderer. */
  pcm: Float32Array;
  onProgress?: (msg: string) => void;
}

// Cache the loaded pipeline per model — first call downloads the weights (cached
// to disk by Transformers.js), later calls are instant.
let localPipe: { model: string; run: (audio: Float32Array, opts: Record<string, unknown>) => Promise<{ text: string }> } | null = null;

export async function transcribeLocal(o: LocalTranscribeOptions): Promise<string> {
  // Lazy + optional. The package is an optional peer dep: a variable specifier
  // keeps both TypeScript and the bundler from trying to resolve it at build
  // time, so the app still builds/runs without it installed.
  const pkg = '@huggingface/transformers';
  let transformers: { pipeline: (...args: unknown[]) => Promise<unknown> };
  try {
    transformers = (await import(/* @vite-ignore */ pkg)) as never;
  } catch {
    throw new Error(
      'Local engine not installed. Run `npm install @huggingface/transformers` and restart, or switch to the cloud engine in Voice settings.'
    );
  }

  if (!localPipe || localPipe.model !== o.model) {
    o.onProgress?.('Loading model…');
    const pipe = await transformers.pipeline('automatic-speech-recognition', o.model, {
      progress_callback: (p: { status?: string; progress?: number }) => {
        if (p?.status === 'progress' && typeof p.progress === 'number') {
          o.onProgress?.(`Downloading model ${Math.round(p.progress)}%`);
        }
      },
    });
    localPipe = { model: o.model, run: pipe as never };
  }

  o.onProgress?.('Transcribing…');
  const out = await localPipe.run(o.pcm, {
    // chunked decoding lets it handle clips longer than 30s
    chunk_length_s: 30,
    stride_length_s: 5,
    language: o.language || undefined,
    task: 'transcribe',
  });
  return (out.text ?? '').trim();
}

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}
