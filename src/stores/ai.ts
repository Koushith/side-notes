import { api } from '@/lib/api';
import type { AISettingsView, AISettingsUpdate } from '@/types';
import { create } from 'zustand';

export type ActionKind = 'improve' | 'grammar' | 'summarize' | 'shorten';

export type ExtendedActionKind =
  | ActionKind
  | 'expand'
  | 'simplify'
  | 'translate'
  | 'change-tone'
  | 'custom';

const SYSTEM_PROMPTS: Record<ActionKind, string> = {
  improve:
    "You are a careful editor. Improve clarity, flow, and word choice in the user's text while preserving meaning, voice, and any markdown formatting. Do not add new information or commentary. Output only the rewritten text.",
  grammar:
    "Correct grammar, spelling, and punctuation in the user's text. Make no stylistic changes; preserve voice, tone, and word choice wherever possible. Preserve markdown formatting. Output only the corrected text.",
  summarize:
    "Summarize the user's text into a concise paragraph (or short bulleted list if the source is long). Capture the key points faithfully. Output only the summary.",
  shorten:
    "Rewrite the user's text to be noticeably shorter while preserving the key information and voice. Preserve markdown formatting. Output only the rewritten text.",
};

export const EXTENDED_SYSTEM_PROMPTS: Record<string, string> = {
  ...SYSTEM_PROMPTS,
  expand:
    "Expand the user's text to be more detailed and comprehensive. Add supporting points, examples, or elaboration where appropriate. Preserve the original voice, meaning, and markdown formatting. Output only the expanded text.",
  simplify:
    "Rewrite the user's text using simpler language and shorter sentences. Make it accessible to a broader audience while keeping the meaning intact. Preserve markdown formatting. Output only the simplified text.",
  translate:
    "Translate the user's text into the specified target language. Preserve formatting, tone, and meaning as closely as possible. Output only the translated text.",
  'change-tone':
    "Rewrite the user's text with the specified tone. Preserve the core meaning, information, and markdown formatting. Output only the rewritten text.",
};

export const ACTION_LABELS: Record<ActionKind, string> = {
  improve: 'Improve writing',
  grammar: 'Fix grammar',
  summarize: 'Summarize',
  shorten: 'Make shorter',
};

export const EXTENDED_ACTION_LABELS: Record<ExtendedActionKind, string> = {
  improve: 'Improve',
  grammar: 'Fix grammar',
  summarize: 'Summarize',
  shorten: 'Shorter',
  expand: 'Expand',
  simplify: 'Simplify',
  translate: 'Translate',
  'change-tone': 'Change tone',
  custom: 'Custom',
};

interface AIState {
  settings: AISettingsView | null;
  loadingSettings: boolean;
  busy: boolean;
  currentAction: ExtendedActionKind | null;
  output: string;
  lastError: string | null;
  activeRequestId: string | null;

  loadSettings: () => Promise<void>;
  saveSettings: (update: AISettingsUpdate) => Promise<AISettingsView | null>;
  run: (kind: ActionKind, source: string) => Promise<void>;
  runCustom: (system: string, user: string) => Promise<void>;
  cancel: () => Promise<void>;
  clearOutput: () => void;
}

function newRequestId(): string {
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useAI = create<AIState>((set, get) => ({
  settings: null,
  loadingSettings: false,
  busy: false,
  currentAction: null,
  output: '',
  lastError: null,
  activeRequestId: null,

  async loadSettings() {
    set({ loadingSettings: true });
    try {
      const s = await api.ai.getSettings();
      set({ settings: s });
    } finally {
      set({ loadingSettings: false });
    }
  },

  async saveSettings(update) {
    try {
      const s = await api.ai.setSettings(update);
      set({ settings: s, lastError: null });
      return s;
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) });
      return null;
    }
  },

  async run(kind, source) {
    if (get().busy) return;
    const trimmed = source.trim();
    if (!trimmed) {
      set({ lastError: 'Nothing to send. Selection or note is empty.' });
      return;
    }
    const id = newRequestId();
    set({
      busy: true,
      currentAction: kind,
      output: '',
      lastError: null,
      activeRequestId: id,
    });

    const offChunk = api.ai.onChunk(id, (delta) => {
      set((s) => ({ output: s.output + delta }));
    });
    const offDone = api.ai.onDone(id, () => {
      offChunk();
      offDone();
      offError();
      set({ busy: false, activeRequestId: null });
    });
    const offError = api.ai.onError(id, (msg) => {
      offChunk();
      offDone();
      offError();
      set({ busy: false, activeRequestId: null, lastError: msg });
    });

    const res = await api.ai.generate(id, {
      system: SYSTEM_PROMPTS[kind],
      user: trimmed,
    });
    if (!res.ok && get().busy) {
      offChunk();
      offDone();
      offError();
      set({ busy: false, activeRequestId: null, lastError: res.error });
    }
  },

  async runCustom(system, user) {
    if (get().busy) return;
    const trimmed = user.trim();
    if (!trimmed) {
      set({ lastError: 'Nothing to send. Selection or note is empty.' });
      return;
    }
    const id = newRequestId();
    set({
      busy: true,
      currentAction: 'custom',
      output: '',
      lastError: null,
      activeRequestId: id,
    });

    const offChunk = api.ai.onChunk(id, (delta) => {
      set((s) => ({ output: s.output + delta }));
    });
    const offDone = api.ai.onDone(id, () => {
      offChunk();
      offDone();
      offError();
      set({ busy: false, activeRequestId: null });
    });
    const offError = api.ai.onError(id, (msg) => {
      offChunk();
      offDone();
      offError();
      set({ busy: false, activeRequestId: null, lastError: msg });
    });

    const res = await api.ai.generate(id, { system, user: trimmed });
    if (!res.ok && get().busy) {
      offChunk();
      offDone();
      offError();
      set({ busy: false, activeRequestId: null, lastError: res.error });
    }
  },

  async cancel() {
    const id = get().activeRequestId;
    if (!id) return;
    await api.ai.cancel(id);
    set({ busy: false, activeRequestId: null });
  },

  clearOutput() {
    set({ output: '', currentAction: null, lastError: null });
  },
}));
