// Local ASR model catalog. Models are downloaded on-demand from HuggingFace.
// Uses sherpa-onnx-node as the runtime (cross-platform, no external binary needed).

import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, createWriteStream, unlinkSync, readdirSync, renameSync } from 'fs';
import https from 'https';
import http from 'http';

export interface LocalModel {
  id: string;
  name: string;
  size: string;
  sizeBytes: number;
  languages: string;
  speed: string;
  recommended?: boolean;
  engine: 'sherpa-whisper' | 'sherpa-paraformer' | 'sherpa-nemo';
  files: { name: string; url: string }[];
}

export const LOCAL_MODELS: LocalModel[] = [
  {
    id: 'nemo-parakeet',
    name: 'Parakeet TDT 0.6B (NVIDIA)',
    size: '680 MB',
    sizeBytes: 680_000_000,
    languages: '25 languages',
    speed: 'Fast, best accuracy',
    recommended: true,
    engine: 'sherpa-nemo',
    files: [
      { name: 'encoder.onnx', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3/resolve/main/encoder.int8.onnx' },
      { name: 'decoder.onnx', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3/resolve/main/decoder.int8.onnx' },
      { name: 'joiner.onnx', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3/resolve/main/joiner.int8.onnx' },
      { name: 'tokens.txt', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3/resolve/main/tokens.txt' },
    ],
  },
  {
    id: 'whisper-base.en',
    name: 'Whisper Base (English)',
    size: '142 MB',
    sizeBytes: 142_000_000,
    languages: 'English only',
    speed: 'Fast',
    engine: 'sherpa-whisper',
    files: [
      { name: 'base.en-encoder.onnx', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-base.en/resolve/main/base.en-encoder.onnx' },
      { name: 'base.en-decoder.onnx', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-base.en/resolve/main/base.en-decoder.onnx' },
      { name: 'base.en-tokens.txt', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-base.en/resolve/main/base.en-tokens.txt' },
    ],
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base (Multilingual)',
    size: '142 MB',
    sizeBytes: 142_000_000,
    languages: '99 languages',
    speed: 'Fast',
    engine: 'sherpa-whisper',
    files: [
      { name: 'base-encoder.onnx', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-base/resolve/main/base-encoder.onnx' },
      { name: 'base-decoder.onnx', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-base/resolve/main/base-decoder.onnx' },
      { name: 'base-tokens.txt', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-base/resolve/main/base-tokens.txt' },
    ],
  },
  {
    id: 'whisper-small.en',
    name: 'Whisper Small (English)',
    size: '466 MB',
    sizeBytes: 466_000_000,
    languages: 'English only',
    speed: 'Moderate, more accurate',
    engine: 'sherpa-whisper',
    files: [
      { name: 'small.en-encoder.onnx', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-small.en/resolve/main/small.en-encoder.onnx' },
      { name: 'small.en-decoder.onnx', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-small.en/resolve/main/small.en-decoder.onnx' },
      { name: 'small.en-tokens.txt', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-small.en/resolve/main/small.en-tokens.txt' },
    ],
  },
  {
    id: 'whisper-tiny.en',
    name: 'Whisper Tiny (English)',
    size: '75 MB',
    sizeBytes: 75_000_000,
    languages: 'English only',
    speed: 'Fastest, lower accuracy',
    engine: 'sherpa-whisper',
    files: [
      { name: 'tiny.en-encoder.onnx', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-tiny.en/resolve/main/tiny.en-encoder.onnx' },
      { name: 'tiny.en-decoder.onnx', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-tiny.en/resolve/main/tiny.en-decoder.onnx' },
      { name: 'tiny.en-tokens.txt', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-tiny.en/resolve/main/tiny.en-tokens.txt' },
    ],
  },
  {
    id: 'paraformer-zh-en',
    name: 'Paraformer (Chinese + English)',
    size: '232 MB',
    sizeBytes: 232_000_000,
    languages: 'Chinese, English',
    speed: 'Fast',
    engine: 'sherpa-paraformer',
    files: [
      { name: 'model.onnx', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-paraformer-zh-2023-09-14/resolve/main/model.int8.onnx' },
      { name: 'tokens.txt', url: 'https://huggingface.co/csukuangfj/sherpa-onnx-paraformer-zh-2023-09-14/resolve/main/tokens.txt' },
    ],
  },
];

export function getModelsDir(): string {
  const dir = join(app.getPath('userData'), 'local-models');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function getModelDir(modelId: string): string {
  const dir = join(getModelsDir(), modelId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function isModelDownloaded(modelId: string): boolean {
  const model = LOCAL_MODELS.find((m) => m.id === modelId);
  if (!model) return false;
  const dir = join(getModelsDir(), modelId);
  return model.files.every((f) => existsSync(join(dir, f.name)));
}

export function getModelFiles(modelId: string): Record<string, string> | null {
  const model = LOCAL_MODELS.find((m) => m.id === modelId);
  if (!model || !isModelDownloaded(modelId)) return null;
  const dir = join(getModelsDir(), modelId);
  const result: Record<string, string> = {};
  for (const f of model.files) {
    result[f.name] = join(dir, f.name);
  }
  return result;
}

export function listDownloadedModels(): string[] {
  return LOCAL_MODELS.filter((m) => isModelDownloaded(m.id)).map((m) => m.id);
}

export interface DownloadProgress {
  modelId: string;
  percent: number;
  fileIndex: number;
  fileCount: number;
  status: 'downloading' | 'done' | 'error';
  error?: string;
}

const activeDownloads = new Map<string, { abort: () => void }>();

export function cancelDownload(modelId: string): boolean {
  const dl = activeDownloads.get(modelId);
  if (dl) {
    dl.abort();
    activeDownloads.delete(modelId);
    return true;
  }
  return false;
}

function downloadFile(url: string, dest: string, onProgress?: (bytes: number, total: number) => void): Promise<void> {
  const tempPath = dest + '.tmp';
  return new Promise((resolve, reject) => {
    const doRequest = (requestUrl: string) => {
      const lib = requestUrl.startsWith('https') ? https : http;
      const req = lib.get(requestUrl, { headers: { 'User-Agent': 'SideNotes/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doRequest(res.headers.location);
          return;
        }
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let downloaded = 0;
        const file = createWriteStream(tempPath);
        res.on('data', (chunk: Buffer) => {
          downloaded += chunk.length;
          onProgress?.(downloaded, total);
        });
        res.pipe(file);
        file.on('finish', () => file.close(() => {
          renameSync(tempPath, dest);
          resolve();
        }));
        file.on('error', (err) => {
          try { unlinkSync(tempPath); } catch {}
          reject(err);
        });
      });
      req.on('error', reject);
    };
    doRequest(url);
  });
}

export async function downloadModel(
  modelId: string,
  onProgress: (p: DownloadProgress) => void
): Promise<void> {
  const model = LOCAL_MODELS.find((m) => m.id === modelId);
  if (!model) throw new Error(`Unknown model: ${modelId}`);

  const dir = getModelDir(modelId);
  let aborted = false;

  activeDownloads.set(modelId, { abort: () => { aborted = true; } });

  for (let i = 0; i < model.files.length; i++) {
    if (aborted) {
      activeDownloads.delete(modelId);
      return;
    }
    const f = model.files[i];
    const dest = join(dir, f.name);
    if (existsSync(dest)) {
      onProgress({ modelId, percent: Math.round(((i + 1) / model.files.length) * 100), fileIndex: i, fileCount: model.files.length, status: 'downloading' });
      continue;
    }
    await downloadFile(f.url, dest, (_downloaded, _total) => {
      const fileProgress = _total > 0 ? _downloaded / _total : 0;
      const overall = ((i + fileProgress) / model.files.length) * 100;
      onProgress({ modelId, percent: Math.round(overall), fileIndex: i, fileCount: model.files.length, status: 'downloading' });
    });
  }

  activeDownloads.delete(modelId);
  onProgress({ modelId, percent: 100, fileIndex: model.files.length, fileCount: model.files.length, status: 'done' });
}

export function deleteModel(modelId: string): boolean {
  const dir = join(getModelsDir(), modelId);
  if (!existsSync(dir)) return false;
  const files = readdirSync(dir);
  for (const f of files) {
    try { unlinkSync(join(dir, f)); } catch {}
  }
  try { require('fs').rmdirSync(dir); } catch {}
  return true;
}
