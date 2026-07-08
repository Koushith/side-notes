import { useEffect, useState } from 'react';
import { Download, Trash2, Check, X, Loader2, HardDrive } from 'lucide-react';
import { api } from '@/lib/api';
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

  const loadModels = async () => {
    const m = await api.whisper.getModels();
    setModels(m);
    setLoading(false);
  };

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

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-text-muted py-4">
        <Loader2 size={14} className="animate-spin" /> Loading models...
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 mb-3">
        <HardDrive size={14} className="text-text-muted" />
        <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Local Models</span>
      </div>
      {models.map((model) => {
        const isDownloading = model.id in downloading;
        const isSelected = selectedModel === model.id;
        const canSelect = model.downloaded && !isDownloading;

        return (
          <div
            key={model.id}
            className={cn(
              'rounded-lg border p-3 transition-colors',
              isSelected ? 'border-accent/50 bg-accent/5' : 'border-border bg-bg-elevated',
              canSelect && !isSelected && 'cursor-pointer hover:border-text-subtle'
            )}
            onClick={() => canSelect && onSelect(model.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text">{model.name}</span>
                {model.recommended && (
                  <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                    Recommended
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {isSelected && <Check size={14} className="text-accent" />}
                {model.downloaded && !isDownloading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(model.id);
                    }}
                    title="Delete model"
                    className="p-1 rounded text-text-subtle hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
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
                {isDownloading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancel(model.id);
                    }}
                    title="Cancel download"
                    className="p-1 rounded text-text-subtle hover:text-text hover:bg-bg-hover transition-colors"
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
          </div>
        );
      })}
    </div>
  );
}
