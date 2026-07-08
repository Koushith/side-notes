// Whisper model catalog for local transcription.
// Models are GGUF format for whisper.cpp or ONNX for Transformers.js.
// Downloaded on-demand from HuggingFace, cached to disk.

import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, createWriteStream, unlinkSync, readdirSync } from 'fs';
import { stat } from 'fs/promises';
import https from 'https';
import http from 'http';

export interface WhisperModel {
  id: string;
  name: string;
  size: string;
  sizeBytes: number;
  languages: string;
  speed: string;
  recommended?: boolean;
  url: string;
  filename: string;
}

export const WHISPER_MODELS: WhisperModel[] = [
  {
    id: 'ggml-tiny.en',
    name: 'Tiny (English)',
    size: '75 MB',
    sizeBytes: 75_000_000,
    languages: 'English only',
    speed: 'Fastest',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
    filename: 'ggml-tiny.en.bin',
  },
  {
    id: 'ggml-base.en',
    name: 'Base (English)',
    size: '142 MB',
    sizeBytes: 142_000_000,
    languages: 'English only',
    speed: 'Fast',
    recommended: true,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    filename: 'ggml-base.en.bin',
  },
  {
    id: 'ggml-small.en',
    name: 'Small (English)',
    size: '466 MB',
    sizeBytes: 466_000_000,
    languages: 'English only',
    speed: 'Moderate',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin',
    filename: 'ggml-small.en.bin',
  },
  {
    id: 'ggml-base',
    name: 'Base (Multilingual)',
    size: '142 MB',
    sizeBytes: 142_000_000,
    languages: '99 languages',
    speed: 'Fast',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    filename: 'ggml-base.bin',
  },
  {
    id: 'ggml-small',
    name: 'Small (Multilingual)',
    size: '466 MB',
    sizeBytes: 466_000_000,
    languages: '99 languages',
    speed: 'Moderate',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    filename: 'ggml-small.bin',
  },
  {
    id: 'ggml-medium',
    name: 'Medium (Multilingual)',
    size: '1.5 GB',
    sizeBytes: 1_500_000_000,
    languages: '99 languages',
    speed: 'Slower, more accurate',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
    filename: 'ggml-medium.bin',
  },
  {
    id: 'ggml-large-v3-turbo',
    name: 'Large v3 Turbo',
    size: '809 MB',
    sizeBytes: 809_000_000,
    languages: '99 languages',
    speed: 'Fast for size, best quality',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin',
    filename: 'ggml-large-v3-turbo.bin',
  },
];

export function getModelsDir(): string {
  const dir = join(app.getPath('userData'), 'whisper-models');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function getBinDir(): string {
  const dir = join(app.getPath('userData'), 'bin');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

const WHISPER_CPP_BINARY_URL =
  process.arch === 'arm64'
    ? 'https://github.com/ggerganov/whisper.cpp/releases/download/v1.7.5/whisper-v1.7.5-bin-darwin-arm64.zip'
    : 'https://github.com/ggerganov/whisper.cpp/releases/download/v1.7.5/whisper-v1.7.5-bin-darwin-x86_64.zip';

export function getWhisperBinaryPath(): string {
  return join(getBinDir(), 'whisper-cli');
}

export function isWhisperBinaryInstalled(): boolean {
  return existsSync(getWhisperBinaryPath());
}

export async function downloadWhisperBinary(
  onProgress?: (msg: string) => void
): Promise<string> {
  const binDir = getBinDir();
  const binPath = getWhisperBinaryPath();
  if (existsSync(binPath)) return binPath;

  onProgress?.('Downloading whisper engine...');

  const zipPath = join(binDir, 'whisper-cpp.zip');

  // Download the zip
  await new Promise<void>((resolve, reject) => {
    const doRequest = (url: string) => {
      const lib = url.startsWith('https') ? https : http;
      const req = lib.get(url, { headers: { 'User-Agent': 'SideNotes/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doRequest(res.headers.location);
          return;
        }
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`Failed to download whisper binary: HTTP ${res.statusCode}`));
          return;
        }
        const file = createWriteStream(zipPath);
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
        file.on('error', reject);
      });
      req.on('error', reject);
    };
    doRequest(WHISPER_CPP_BINARY_URL);
  });

  onProgress?.('Extracting whisper engine...');

  // Extract the zip using macOS built-in unzip
  const { execSync } = require('child_process');
  execSync(`unzip -o "${zipPath}" -d "${binDir}"`, { stdio: 'ignore' });

  // Find the whisper binary in the extracted contents
  const { readdirSync: readdir } = require('fs');
  const extractedFiles = readdir(binDir, { recursive: true }) as string[];
  const whisperFile = extractedFiles.find(
    (f: string) => f.endsWith('/whisper-cli') || f === 'whisper-cli' || f.endsWith('/main') || f === 'main'
  );

  if (whisperFile) {
    const extractedPath = join(binDir, whisperFile);
    if (extractedPath !== binPath) {
      const { copyFileSync } = require('fs');
      copyFileSync(extractedPath, binPath);
    }
  }

  // Make executable
  const { chmodSync } = require('fs');
  try { chmodSync(binPath, 0o755); } catch {}

  // Cleanup zip
  try { unlinkSync(zipPath); } catch {}

  if (!existsSync(binPath)) {
    throw new Error('Failed to extract whisper binary. Try installing manually: brew install whisper-cpp');
  }

  return binPath;
}

export function isModelDownloaded(modelId: string): boolean {
  const model = WHISPER_MODELS.find((m) => m.id === modelId);
  if (!model) return false;
  return existsSync(join(getModelsDir(), model.filename));
}

export function getModelPath(modelId: string): string | null {
  const model = WHISPER_MODELS.find((m) => m.id === modelId);
  if (!model) return null;
  const p = join(getModelsDir(), model.filename);
  return existsSync(p) ? p : null;
}

export async function getModelFileSize(modelId: string): Promise<number> {
  const model = WHISPER_MODELS.find((m) => m.id === modelId);
  if (!model) return 0;
  const p = join(getModelsDir(), model.filename);
  try {
    const s = await stat(p);
    return s.size;
  } catch {
    return 0;
  }
}

export function listDownloadedModels(): string[] {
  const dir = getModelsDir();
  const files = readdirSync(dir);
  return WHISPER_MODELS
    .filter((m) => files.includes(m.filename))
    .map((m) => m.id);
}

export interface DownloadProgress {
  modelId: string;
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
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

export function downloadModel(
  modelId: string,
  onProgress: (p: DownloadProgress) => void
): Promise<void> {
  const model = WHISPER_MODELS.find((m) => m.id === modelId);
  if (!model) return Promise.reject(new Error(`Unknown model: ${modelId}`));

  const destPath = join(getModelsDir(), model.filename);
  const tempPath = destPath + '.tmp';

  return new Promise((resolve, reject) => {
    let aborted = false;

    const doRequest = (url: string) => {
      const lib = url.startsWith('https') ? https : http;
      const req = lib.get(url, { headers: { 'User-Agent': 'SideNotes/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doRequest(res.headers.location);
          return;
        }
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10) || model.sizeBytes;
        let downloadedBytes = 0;

        const file = createWriteStream(tempPath);

        res.on('data', (chunk: Buffer) => {
          if (aborted) return;
          downloadedBytes += chunk.length;
          const percent = Math.round((downloadedBytes / totalBytes) * 100);
          onProgress({ modelId, percent, downloadedBytes, totalBytes, status: 'downloading' });
        });

        res.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            if (aborted) {
              try { unlinkSync(tempPath); } catch {}
              return;
            }
            try {
              const { renameSync } = require('fs');
              renameSync(tempPath, destPath);
            } catch (err) {
              reject(err);
              return;
            }
            activeDownloads.delete(modelId);
            onProgress({ modelId, percent: 100, downloadedBytes: totalBytes, totalBytes, status: 'done' });
            resolve();
          });
        });

        file.on('error', (err) => {
          try { unlinkSync(tempPath); } catch {}
          reject(err);
        });
      });

      req.on('error', (err) => {
        if (!aborted) reject(err);
      });

      activeDownloads.set(modelId, {
        abort: () => {
          aborted = true;
          req.destroy();
          try { unlinkSync(tempPath); } catch {}
          activeDownloads.delete(modelId);
        },
      });
    };

    doRequest(model.url);
  });
}

export function deleteModel(modelId: string): boolean {
  const model = WHISPER_MODELS.find((m) => m.id === modelId);
  if (!model) return false;
  const p = join(getModelsDir(), model.filename);
  try {
    unlinkSync(p);
    return true;
  } catch {
    return false;
  }
}
