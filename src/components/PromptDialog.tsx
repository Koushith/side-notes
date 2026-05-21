import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { cn } from '@/lib/utils';

// Electron's window.prompt() throws — this is the replacement. Promise-based so call sites
// can `const v = await promptUser(...)` and keep the existing flow.

export interface PromptOptions {
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  okLabel?: string;
  cancelLabel?: string;
  /** Return a string to show as a validation error; return null/undefined for valid. */
  validate?: (value: string) => string | null | undefined;
}

interface PromptState {
  options: PromptOptions | null;
  resolver: ((value: string | null) => void) | null;
  open: (opts: PromptOptions) => Promise<string | null>;
  resolve: (value: string | null) => void;
}

const usePromptStore = create<PromptState>((set, get) => ({
  options: null,
  resolver: null,
  open(opts) {
    // If another prompt is already open, reject it first.
    const prev = get().resolver;
    if (prev) prev(null);
    return new Promise<string | null>((resolve) => {
      set({ options: opts, resolver: resolve });
    });
  },
  resolve(value) {
    const r = get().resolver;
    set({ options: null, resolver: null });
    if (r) r(value);
  },
}));

export function promptUser(opts: PromptOptions): Promise<string | null> {
  return usePromptStore.getState().open(opts);
}

export function PromptHost() {
  const options = usePromptStore((s) => s.options);
  const resolve = usePromptStore((s) => s.resolve);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (options) {
      setValue(options.defaultValue ?? '');
      setError(null);
      // Defer focus until after the dialog mounts.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [options]);

  useEffect(() => {
    if (!options) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        resolve(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [options, resolve]);

  if (!options) return null;

  const submit = () => {
    const v = value;
    if (options.validate) {
      const err = options.validate(v);
      if (err) {
        setError(err);
        return;
      }
    }
    resolve(v);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) resolve(null);
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
        <div className="px-5 pb-4">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={options.placeholder}
            className={cn(
              'w-full px-3 py-2 text-sm rounded-md bg-bg border border-border outline-none',
              'focus:border-accent focus:ring-1 focus:ring-accent/30',
              error && 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
            )}
          />
          {error && <div className="mt-1.5 text-[11px] text-red-500">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-4">
          <button
            onClick={() => resolve(null)}
            className="px-3 py-1.5 text-[12.5px] rounded-md text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
          >
            {options.cancelLabel ?? 'Cancel'}
          </button>
          <button
            onClick={submit}
            className="px-3 py-1.5 text-[12.5px] rounded-md bg-accent text-accent-ink hover:opacity-90 transition-opacity"
          >
            {options.okLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
