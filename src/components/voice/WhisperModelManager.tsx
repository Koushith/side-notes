import { useEffect, useRef, useState } from 'react';
import { Download, Trash2, Check, X, Loader2, HardDrive, Mic, CircleStop, Terminal, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { startRecording, decodeToPcm16k, type RecorderHandle } from '@/lib/recorder';
import type { WhisperModelView, WhisperDownloadProgress } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  selectedModel: string;
  onSelect: (modelId: string) => void;
}

export function WhisperModelManager({ selectedModel, onSelect }: Props) {
  const [models, setModels] = useState<WhisperModelView[]>([]);
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ modelId: string; text: string; ok: boolean } | null>(null);
  const [binaryReady, setBinaryReady] = useState<boolean | null>(null);
  const recorderRef = useRef<RecorderHandle | null>(null);

  const loadModels = async () => {
    const m = await api.whisper.getModels();
    setModels(m);
    setLoading(false);
  };

  useEffect(() => {
    api.whisper.getStatus().then((s) => setBinaryReady(s.binaryInstalled));
  }, []);

  useEffect(() => {
    loadModels();
    const off = api.whisper.onDownloadProgress((p: unknown) => {
      const prog = p as WhisperDownloadProgress;
      if (prog.status === 'done') {
        setDownloading((d) => {
          const next = { ...d };
          delete next[prog.modelId];
          return next;
        });
        loadModels();
      } else if (prog.status === 'error') {
        setDownloading((d) => {
          const next = { ...d };
          delete next[prog.modelId];
          return next;
        });
      } else {
        setDownloading((d) => ({ ...d, [prog.modelId]: prog.percent }));
      }
    });
    return off;
  }, []);

  const handleDownload = async (modelId: string) => {
    setDownloading((d) => ({ ...d, [modelId]: 0 }));
    const res = await api.whisper.download(modelId);
    if (!res.ok) {
      setDownloading((d) => {
        const next = { ...d };
        delete next[modelId];
        return next;
      });
    }
  };

  const handleDelete = async (modelId: string) => {
    await api.whisper.deleteModel(modelId);
    if (selectedModel === modelId) onSelect('');
    loadModels();
  };

  const handleCancel = (modelId: string) => {
    api.whisper.cancelDownload(modelId);
    setDownloading((d) => {
      const next = { ...d };
      delete next[modelId];
      return next;
    });
  };

  const handleTest = async (modelId: string) => {
    setTesting(modelId);
    setTestResult(null);
    try {
      await api.voice.requestMic();
      const recorder = await startRecording();
      recorderRef.current = recorder;
      // Record for 3 seconds then transcribe
      await new Promise((r) => setTimeout(r, 3000));
      if (!recorderRef.current) return;
      const rec = await recorderRef.current.stop();
      recorderRef.current = null;
      const pcm = await decodeToPcm16k(rec.blob);
      // Temporarily save the model selection so transcription uses it
      await api.voice.setSettings({ engine: 'local', local: { model: modelId } });
      const id = `test-${Date.now()}`;
      const res = await api.voice.transcribe(id, { kind: 'local', pcm });
      if (res.ok) {
        setTestResult({ modelId, text: res.text || '(no speech detected)', ok: true });
      } else {
        setTestResult({ modelId, text: res.error, ok: false });
      }
    } catch (err) {
      setTestResult({ modelId, text: err instanceof Error ? err.message : 'Test failed', ok: false });
    } finally {
      setTesting(null);
    }
  };

  const handleStopTest = () => {
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    setTesting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-text-muted py-4">
        <Loader2 size={14} className="animate-spin" /> Loading models...
      </div>
    );
  }

  const hasDownloaded = models.some((m) => m.downloaded);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 mb-3">
        <HardDrive size={14} className="text-text-muted" />
        <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Local Models</span>
      </div>

      {/* Setup status */}
      {binaryReady !== null && (
        <div className={cn(
          'rounded-lg border px-3 py-2.5 mb-3 text-[11.5px] leading-relaxed',
          binaryReady && hasDownloaded
            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
            : 'border-border bg-bg text-text-muted'
        )}>
          {binaryReady && hasDownloaded ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="shrink-0" />
              <span>Ready. Hold your hotkey to dictate, or use the mic test below.</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="font-medium text-text text-xs">Setup (one-time)</div>
              <div className="flex items-start gap-2">
                <span className={cn('shrink-0 mt-0.5', binaryReady ? 'text-emerald-400' : 'text-text-subtle')}>
                  {binaryReady ? <CheckCircle2 size={12} /> : <Terminal size={12} />}
                </span>
                <span>
                  <span className={cn(binaryReady && 'line-through opacity-60')}>
                    Install whisper engine:
                  </span>
                  {!binaryReady && (
                    <code className="ml-1 px-1.5 py-0.5 rounded bg-bg-elevated text-[10.5px] font-mono text-text select-all">
                      brew install whisper-cpp
                    </code>
                  )}
                  {binaryReady && <span className="ml-1 text-emerald-400">done</span>}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className={cn('shrink-0 mt-0.5', hasDownloaded ? 'text-emerald-400' : 'text-text-subtle')}>
                  {hasDownloaded ? <CheckCircle2 size={12} /> : <Download size={12} />}
                </span>
                <span className={cn(hasDownloaded && 'line-through opacity-60')}>
                  Download a model below (Base English recommended)
                </span>
                {hasDownloaded && <span className="ml-1 text-emerald-400">done</span>}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="max-h-[280px] overflow-y-auto space-y-1.5 pr-1">
      {models.map((model) => {
        const isDownloading = model.id in downloading;
        const isSelected = selectedModel === model.id;
        const isTesting = testing === model.id;
        const hasTestResult = testResult?.modelId === model.id;

        return (
          <div
            key={model.id}
            className={cn(
              'rounded-lg border p-3 transition-colors',
              isSelected ? 'border-accent/50 bg-accent/5' : 'border-border bg-bg-elevated',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text">{model.name}</span>
                {model.recommended && (
                  <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                    Recommended
                  </span>
                )}
                {isSelected && (
                  <span className="text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {/* Downloaded: show Select + Test + Delete */}
                {model.downloaded && !isDownloading && !isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(model.id);
                    }}
                    className="px-2 py-1 rounded text-xs font-medium text-text bg-bg-hover hover:bg-accent/20 hover:text-accent transition-colors"
                  >
                    Select
                  </button>
                )}
                {model.downloaded && !isDownloading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isTesting) handleStopTest();
                      else handleTest(model.id);
                    }}
                    disabled={testing !== null && !isTesting}
                    title={isTesting ? 'Stop test' : 'Test: records 3s and transcribes'}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      isTesting
                        ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                        : 'text-text-subtle hover:text-accent hover:bg-accent/10'
                    )}
                  >
                    {isTesting ? <CircleStop size={13} /> : <Mic size={13} />}
                  </button>
                )}
                {model.downloaded && !isDownloading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(model.id);
                    }}
                    title="Delete model"
                    className="p-1.5 rounded text-text-subtle hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                {/* Not downloaded: show Download */}
                {!model.downloaded && !isDownloading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(model.id);
                    }}
                    title="Download model"
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 transition-colors"
                  >
                    <Download size={12} />
                    Download
                  </button>
                )}
                {/* Downloading: show progress + cancel */}
                {isDownloading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancel(model.id);
                    }}
                    title="Cancel download"
                    className="p-1.5 rounded text-text-subtle hover:text-text hover:bg-bg-hover transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
              <span>{model.size}</span>
              <span>{model.languages}</span>
              <span>{model.speed}</span>
            </div>
            {/* Download progress */}
            {isDownloading && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${downloading[model.id]}%` }}
                  />
                </div>
                <span className="text-[10px] text-text-subtle mt-0.5 block">
                  {downloading[model.id]}% downloaded
                </span>
              </div>
            )}
            {/* Test recording indicator */}
            {isTesting && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-accent">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                  <span className="relative rounded-full h-2 w-2 bg-red-500" />
                </span>
                Listening (3s)...
              </div>
            )}
            {/* Test result */}
            {hasTestResult && !isTesting && (
              <div className={cn(
                'mt-2 px-2 py-1.5 rounded text-[11px] border',
                testResult.ok
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/5 border-red-500/20 text-red-400'
              )}>
                {testResult.ok ? '✓ ' : '✕ '}{testResult.text}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
