import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { cn } from '@/lib/utils';

// Replacement for window.confirm — same vibe as PromptDialog, themed to the app.

export interface ConfirmOptions {
  title: string;
  message?: string;
  okLabel?: string;
  cancelLabel?: string;
  /** Style the OK button as a destructive action (red). */
  destructive?: boolean;
}

interface ConfirmState {
  options: ConfirmOptions | null;
  resolver: ((value: boolean) => void) | null;
  open: (opts: ConfirmOptions) => Promise<boolean>;
  resolve: (value: boolean) => void;
}

const useConfirmStore = create<ConfirmState>((set, get) => ({
  options: null,
  resolver: null,
  open(opts) {
    const prev = get().resolver;
    if (prev) prev(false);
    return new Promise<boolean>((resolve) => {
      set({ options: opts, resolver: resolve });
    });
  },
  resolve(value) {
    const r = get().resolver;
    set({ options: null, resolver: null });
    if (r) r(value);
  },
}));

export function confirmUser(opts: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().open(opts);
}

export function ConfirmHost() {
  const options = useConfirmStore((s) => s.options);
  const resolve = useConfirmStore((s) => s.resolve);
  const okRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (options) {
      requestAnimationFrame(() => okRef.current?.focus());
    }
  }, [options]);

  useEffect(() => {
    if (!options) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        resolve(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        resolve(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [options, resolve]);

  if (!options) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) resolve(false);
      }}
    >
      <div
        className="w-[420px] max-w-[92vw] rounded-xl border border-border bg-bg-elevated shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-2">
          <h2 className="text-sm font-semibold text-text">{options.title}</h2>
          {options.message && (
            <p className="mt-1 text-[12px] text-text-muted">{options.message}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 pt-2 pb-4">
          <button
            onClick={() => resolve(false)}
            className="px-3 py-1.5 text-[12.5px] rounded-md text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
          >
            {options.cancelLabel ?? 'Cancel'}
          </button>
          <button
            ref={okRef}
            onClick={() => resolve(true)}
            className={cn(
              'px-3 py-1.5 text-[12.5px] rounded-md transition-opacity hover:opacity-90',
              options.destructive
                ? 'bg-red-500 text-white'
                : 'bg-accent text-accent-ink'
            )}
          >
            {options.okLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
