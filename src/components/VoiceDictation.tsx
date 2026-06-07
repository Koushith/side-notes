import { useEffect, useRef, useState } from 'react';
import { Mic, Loader2, X } from 'lucide-react';
import { useVoice, getVoiceHotkey } from '@/stores/voice';
import { cn } from '@/lib/utils';

// Number of bars in the live waveform.
const BARS = 28;

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

  // Drive the waveform while recording by sampling the mic level each frame and
  // scrolling the bar buffer left.
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

  // Hold-to-talk: hold the configured key to record, release to transcribe.
  // Esc cancels. We ignore the hotkey while a text input/rebind field is focused
  // so typing F-keys into settings doesn't trigger it.
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

  // Auto-dismiss an error after a few seconds.
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
    <div className="fixed bottom-5 right-5 z-[150] flex flex-col items-end gap-2 select-none">
      {lastError && (
        <div className="max-w-[280px] rounded-lg border border-red-500/30 bg-bg-elevated px-3 py-2 text-[12px] text-red-400 shadow-lg animate-fade-in">
          {lastError}
        </div>
      )}

      {status === 'idle' ? (
        // Resting state: a small mic button. Click or hold the hotkey to dictate.
        <button
          onClick={onButtonClick}
          title={`Dictate — hold ${getVoiceHotkey()} or click`}
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-bg-elevated text-text-muted shadow-lg transition-colors hover:text-text hover:bg-bg-hover"
        >
          <Mic size={17} />
        </button>
      ) : (
        // Active pill: waveform while recording, spinner while transcribing.
        <div className="flex items-center gap-3 rounded-full border border-border bg-bg-elevated py-2 pl-3 pr-2 shadow-2xl animate-fade-in">
          {status === 'recording' ? (
            <>
              <span className="relative grid h-6 w-6 place-items-center">
                <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <div className="flex h-6 items-center gap-[2px]">
                {levels.map((l, i) => (
                  <span
                    key={i}
                    className="w-[2.5px] rounded-full bg-accent"
                    style={{ height: `${Math.max(2, l * 24)}px`, opacity: 0.5 + l * 0.5 }}
                  />
                ))}
              </div>
              <button
                onClick={onButtonClick}
                title="Stop & insert"
                className="grid h-7 w-7 place-items-center rounded-full bg-accent text-bg transition-colors hover:bg-accent-hover"
              >
                <Mic size={14} />
              </button>
            </>
          ) : (
            <>
              <Loader2 size={16} className="animate-spin text-accent" />
              <span className="text-[12.5px] text-text-muted">{progress || 'Transcribing…'}</span>
              <button
                onClick={cancel}
                title="Cancel"
                className="grid h-7 w-7 place-items-center rounded-full text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
