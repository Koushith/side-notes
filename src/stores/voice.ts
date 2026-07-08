import { create } from 'zustand';
import { api } from '@/lib/api';
import { useEditorRef } from '@/stores/editorRef';
import { startRecording, decodeToPcm16k, type RecorderHandle } from '@/lib/recorder';
import type { VoiceSettingsView, VoiceSettingsUpdate } from '@/types';

export type VoiceStatus = 'idle' | 'recording' | 'transcribing';

// System prompt for the optional cleanup pass — turns raw dictation into clean
// prose without inventing content. Runs on the configured AI provider.
const CLEANUP_SYSTEM =
  'You clean up dictated speech into polished written text. Remove filler words ' +
  '(um, uh, like, you know), false starts, and repeated stutters. Add correct ' +
  'punctuation, capitalization, and paragraph breaks. Fix obvious transcription ' +
  'slips. Do NOT add new information, change the meaning, answer questions, or add ' +
  'any commentary — preserve the speaker’s wording and tone. Output only the ' +
  'cleaned text, nothing else.';

// Kept outside zustand state so the per-frame level poll never triggers renders.
let handle: RecorderHandle | null = null;

interface VoiceState {
  status: VoiceStatus;
  progress: string;
  lastError: string | null;
  settings: VoiceSettingsView | null;
  activeId: string | null;

  loadSettings: () => Promise<void>;
  saveSettings: (update: VoiceSettingsUpdate) => Promise<VoiceSettingsView | null>;
  /** Current mic level 0..1 for the waveform; 0 when not recording. */
  getLevel: () => number;
  /** Frequency band amplitudes (0..1) for real audio visualization. */
  getFrequencies: (bandCount: number) => number[] | null;
  start: () => Promise<void>;
  stopAndTranscribe: () => Promise<void>;
  cancel: () => void;
}

function newId(): string {
  return `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Hold-to-talk key. Stored renderer-side (it's an in-app shortcut, not a global
// OS hotkey) the same way the rest of the UI prefs are. Value is a KeyboardEvent
// `key`, e.g. "F2".
const HOTKEY_KEY = 'second-brain.voice.hotkey';
export const DEFAULT_HOTKEY = 'F2';

export function getVoiceHotkey(): string {
  try {
    return localStorage.getItem(HOTKEY_KEY) || DEFAULT_HOTKEY;
  } catch {
    return DEFAULT_HOTKEY;
  }
}

export function setVoiceHotkey(key: string) {
  try {
    localStorage.setItem(HOTKEY_KEY, key);
  } catch {
    /* ignore */
  }
}

/** Run the cleanup pass over `raw`, accumulating the streamed AI output. Returns
 *  the raw text unchanged if anything goes wrong (no provider configured, etc.). */
function cleanup(raw: string): Promise<string> {
  return new Promise((resolve) => {
    const id = newId();
    let out = '';
    const offChunk = api.ai.onChunk(id, (d) => {
      out += d;
    });
    const finish = (text: string) => {
      offChunk();
      offDone();
      offError();
      const trimmed = text.trim();
      resolve(trimmed || raw);
    };
    const offDone = api.ai.onDone(id, () => finish(out));
    const offError = api.ai.onError(id, () => finish(raw));
    api.ai.generate(id, { system: CLEANUP_SYSTEM, user: raw }).then((res) => {
      if (!res.ok) finish(raw);
    });
  });
}

export const useVoice = create<VoiceState>((set, get) => ({
  status: 'idle',
  progress: '',
  lastError: null,
  settings: null,
  activeId: null,

  async loadSettings() {
    const s = await api.voice.getSettings();
    set({ settings: s });
  },

  async saveSettings(update) {
    try {
      const s = await api.voice.setSettings(update);
      set({ settings: s, lastError: null });
      return s;
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) });
      return null;
    }
  },

  getLevel() {
    return get().status === 'recording' && handle ? handle.level() : 0;
  },

  getFrequencies(bandCount: number) {
    return get().status === 'recording' && handle ? handle.frequencies(bandCount) : null;
  },

  async start() {
    if (get().status !== 'idle') return;
    // No editor focused → nowhere to put the text.
    if (!useEditorRef.getState().editor) {
      set({ lastError: 'Open a note to dictate into.' });
      return;
    }
    set({ lastError: null, progress: '' });
    try {
      await api.voice.requestMic();
      handle = await startRecording();
      set({ status: 'recording' });
    } catch (err) {
      handle = null;
      set({
        status: 'idle',
        lastError:
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Microphone access denied. Enable it in System Settings → Privacy → Microphone.'
            : err instanceof Error
              ? err.message
              : 'Could not start recording.',
      });
    }
  },

  async stopAndTranscribe() {
    if (get().status !== 'recording' || !handle) return;
    const id = newId();
    set({ status: 'transcribing', activeId: id, progress: 'Transcribing…' });
    const off = api.voice.onProgress(id, (msg) => set({ progress: msg }));
    try {
      const rec = await handle.stop();
      handle = null;
      const settings = get().settings;
      const engine = settings?.engine ?? 'cloud';

      let result;
      if (engine === 'local') {
        set({ progress: 'Decoding audio…' });
        const pcm = await decodeToPcm16k(rec.blob);
        result = await api.voice.transcribe(id, { kind: 'local', pcm });
      } else {
        const audio = await rec.blob.arrayBuffer();
        result = await api.voice.transcribe(id, { kind: 'cloud', audio, mimeType: rec.mimeType });
      }

      if (!result.ok) {
        set({ status: 'idle', activeId: null, progress: '', lastError: result.error });
        return;
      }

      let text = result.text;
      if (text && settings?.cleanup) {
        set({ progress: 'Polishing…' });
        text = await cleanup(text);
      }

      if (text) {
        const editor = useEditorRef.getState().editor;
        // Insert at the cursor with a trailing space so consecutive dictations
        // don't run together.
        editor?.chain().focus().insertContent(text.endsWith(' ') ? text : text + ' ').run();
      }
      set({ status: 'idle', activeId: null, progress: '' });
    } catch (err) {
      handle = null;
      set({
        status: 'idle',
        activeId: null,
        progress: '',
        lastError: err instanceof Error ? err.message : String(err),
      });
    } finally {
      off();
    }
  },

  cancel() {
    const { status, activeId } = get();
    if (status === 'recording' && handle) {
      handle.cancel();
      handle = null;
    } else if (status === 'transcribing' && activeId) {
      api.voice.cancel(activeId);
    }
    set({ status: 'idle', activeId: null, progress: '', lastError: null });
  },
}));
