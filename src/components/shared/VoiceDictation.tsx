import { useEffect, useRef, useState } from 'react';
import { Mic, Loader2, X } from 'lucide-react';
import { useVoice, getVoiceHotkey } from '@/stores/voice';
import { cn } from '@/lib/utils';

const BARS = 24;

export function VoiceDictation() {
  const status = useVoice((s) => s.status);
  const progress = useVoice((s) => s.progress);
  const lastError = useVoice((s) => s.lastError);
  const start = useVoice((s) => s.start);
  const stopAndTranscribe = useVoice((s) => s.stopAndTranscribe);
  const cancel = useVoice((s) => s.cancel);
  const loadSettings = useVoice((s) => s.settings);
  const load = useVoice((s) => s.loadSettings);

  const [levels, setLevels] = useState<number[]>(() => new Array(BARS).fill(0));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loadSettings) load();
  }, [loadSettings, load]);

  useEffect(() => {
    if (status !== 'recording') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setLevels(new Array(BARS).fill(0));
      return;
    }
    const tick = () => {
      const lvl = useVoice.getState().getLevel();
      setLevels((prev) => [...prev.slice(1), lvl]);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [status]);

  useEffect(() => {
    const isEditableTarget = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.dataset.voiceRebind === 'true');

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useVoice.getState().status !== 'idle') {
        cancel();
        return;
      }
      if (e.repeat) return;
      if (e.key !== getVoiceHotkey()) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      if (useVoice.getState().status === 'idle') start();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== getVoiceHotkey()) return;
      if (useVoice.getState().status === 'recording') {
        e.preventDefault();
        stopAndTranscribe();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [start, stopAndTranscribe, cancel]);

  useEffect(() => {
    if (!lastError) return;
    const t = window.setTimeout(() => useVoice.setState({ lastError: null }), 5000);
    return () => window.clearTimeout(t);
  }, [lastError]);

  const onButtonClick = () => {
    const s = useVoice.getState().status;
    if (s === 'idle') start();
    else if (s === 'recording') stopAndTranscribe();
    else cancel();
  };

  return (
    <>
      {/* Error toast */}
      {lastError && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[151] max-w-[320px] rounded-lg border border-red-500/30 bg-bg-elevated px-4 py-2.5 text-[12px] text-red-400 shadow-lg animate-fade-in">
          {lastError}
        </div>
      )}

      {/* Idle: small floating mic button */}
      {status === 'idle' && (
        <button
          onClick={onButtonClick}
          title={`Dictate — hold ${getVoiceHotkey()} or click`}
          className="fixed bottom-5 right-5 z-[150] grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-bg-elevated/80 backdrop-blur-sm text-text-muted shadow-lg transition-all hover:scale-105 hover:text-text hover:border-accent/40 hover:shadow-accent/10"
        >
          <Mic size={15} />
        </button>
      )}

      {/* Recording: centered bottom pill with waveform */}
      {status === 'recording' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 rounded-full border border-border/40 bg-bg-elevated/90 backdrop-blur-xl py-2 pl-4 pr-3 shadow-2xl animate-fade-in">
          {/* Pulsing red dot */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
            <span className="relative rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>

          {/* Waveform */}
          <div className="flex h-5 items-center gap-[1.5px]">
            {levels.map((l, i) => {
              const center = BARS / 2;
              const dist = Math.abs(i - center) / center;
              const emphasis = 1 - dist * 0.4;
              return (
                <span
                  key={i}
                  className="w-[2px] rounded-full bg-accent transition-[height] duration-75"
                  style={{
                    height: `${Math.max(2, l * 20 * emphasis)}px`,
                    opacity: 0.4 + l * 0.6,
                  }}
                />
              );
            })}
          </div>

          {/* Stop button */}
          <button
            onClick={onButtonClick}
            title="Stop & insert"
            className="grid h-7 w-7 place-items-center rounded-full bg-accent/90 text-bg transition-all hover:bg-accent hover:scale-105"
          >
            <Mic size={12} />
          </button>
        </div>
      )}

      {/* Transcribing: centered bottom pill with spinner */}
      {status === 'transcribing' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-2.5 rounded-full border border-border/40 bg-bg-elevated/90 backdrop-blur-xl py-2 pl-4 pr-3 shadow-2xl animate-fade-in">
          <Loader2 size={14} className="animate-spin text-accent" />
          <span className="text-[12px] text-text-muted whitespace-nowrap">{progress || 'Transcribing...'}</span>
          <button
            onClick={cancel}
            title="Cancel"
            className="grid h-6 w-6 place-items-center rounded-full text-text-subtle transition-colors hover:bg-bg-hover hover:text-text"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </>
  );
}
