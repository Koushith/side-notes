import { useEffect } from 'react';
import { create } from 'zustand';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Non-blocking replacement for window.alert. Stacks bottom-right; auto-dismisses.

type ToastKind = 'error' | 'success' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  items: ToastItem[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

const useToastStore = create<ToastState>((set) => ({
  items: [],
  push(kind, message) {
    const id = nextId++;
    set((s) => ({ items: [...s.items, { id, kind, message }] }));
    // Auto-dismiss
    window.setTimeout(() => {
      set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
    }, kind === 'error' ? 6000 : 3500);
  },
  dismiss(id) {
    set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
  },
}));

export function toast(message: string, kind: ToastKind = 'info') {
  useToastStore.getState().push(kind, message);
}
toast.error = (message: string) => useToastStore.getState().push('error', message);
toast.success = (message: string) => useToastStore.getState().push('success', message);
toast.info = (message: string) => useToastStore.getState().push('info', message);

export function ToastHost() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    // Keep host mounted even with no items so transitions can fire.
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[210] flex flex-col gap-2 pointer-events-none">
      {items.map((t) => {
        const Icon =
          t.kind === 'error' ? AlertCircle : t.kind === 'success' ? CheckCircle2 : Info;
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2.5 max-w-[360px] px-3.5 py-2.5 rounded-lg border shadow-2xl text-[12.5px] animate-fade-in',
              t.kind === 'error'
                ? 'bg-bg-elevated border-red-500/50 text-text'
                : t.kind === 'success'
                  ? 'bg-bg-elevated border-tag/50 text-text'
                  : 'bg-bg-elevated border-border text-text'
            )}
          >
            <Icon
              size={14}
              className={cn(
                'shrink-0 mt-0.5',
                t.kind === 'error' && 'text-red-500',
                t.kind === 'success' && 'text-tag',
                t.kind === 'info' && 'text-accent'
              )}
            />
            <div className="flex-1 whitespace-pre-wrap break-words">{t.message}</div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 -mr-1 -mt-0.5 p-1 rounded hover:bg-bg-hover text-text-subtle hover:text-text"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
