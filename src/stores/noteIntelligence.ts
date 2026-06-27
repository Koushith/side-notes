import { create } from 'zustand';
import { api } from '@/lib/api';

export interface TagSuggestion {
  tags: string[];
  dismissed: boolean;
}

export interface TitleSuggestion {
  title: string;
  dismissed: boolean;
}

export interface TodoItem {
  text: string;
}

export interface TodoSuggestion {
  items: TodoItem[];
  dismissed: boolean;
}

export interface LinkSuggestion {
  targetRel: string;
  targetTitle: string;
  reason: string;
}

export interface ContinuationSuggestion {
  text: string;
  dismissed: boolean;
}

export type IntelligenceFeature =
  | 'autoTag'
  | 'smartTitle'
  | 'extractTodos'
  | 'linkSuggestions'
  | 'continueWriting';

export interface NoteContext {
  rel: string;
  title: string;
  tags: string[];
}

interface NoteIntelligenceState {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  features: Record<IntelligenceFeature, boolean>;
  setFeature: (f: IntelligenceFeature, v: boolean) => void;

  activeRel: string | null;
  wordCount: number;

  tags: TagSuggestion | null;
  title: TitleSuggestion | null;
  todos: TodoSuggestion | null;
  links: LinkSuggestion[];
  continuation: ContinuationSuggestion | null;
  loading: Set<IntelligenceFeature>;

  analyzeContent: (rel: string, content: string, allNotes: NoteContext[]) => void;
  onPause: (rel: string, content: string) => void;
  dismissTag: () => void;
  dismissTitle: () => void;
  dismissTodos: () => void;
  dismissContinuation: () => void;
  reset: () => void;
}

// Prompts
const TAG_SYSTEM = `You suggest tags for a note. Return ONLY a JSON array of 1-5 lowercase tag strings (no # prefix). Example: ["productivity","meeting-notes","q4"]. No explanation.`;
const TITLE_SYSTEM = `Suggest a concise, descriptive title for this untitled note. Return ONLY the title text, nothing else. Keep it under 8 words.`;
const TODO_SYSTEM = `Extract action items from this note. Return ONLY a JSON array of objects with "text" (the todo). Example: [{"text":"Send report to team"}]. If no action items, return [].`;
const LINK_SYSTEM = `Given a note and a list of other notes in the vault, suggest which existing notes are most related. Return ONLY a JSON array of objects with "targetRel" (the note's relative path), "targetTitle", and "reason" (one short sentence). Max 3 suggestions. If none are relevant, return [].`;
const CONTINUE_SYSTEM = `Continue writing this note naturally. Match the tone, style, and topic. Write 1-3 sentences. Output ONLY the continuation text.`;

const DEBOUNCE_MS = 3000;
const MIN_WORDS_FOR_TAGS = 30;
const MIN_WORDS_FOR_TITLE = 80;
const MIN_WORDS_FOR_TODOS = 40;
const MIN_WORDS_FOR_LINKS = 50;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function runAI(system: string, user: string): Promise<string> {
  const id = `intel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  let result = '';

  return new Promise<string>((resolve, reject) => {
    const offChunk = api.ai.onChunk(id, (delta: string) => { result += delta; });
    const offDone = api.ai.onDone(id, () => { cleanup(); resolve(result); });
    const offError = api.ai.onError(id, (msg: string) => { cleanup(); reject(new Error(msg)); });

    function cleanup() { offChunk(); offDone(); offError(); }

    api.ai.generate(id, { system, user }).then((res: { ok: boolean; error?: string }) => {
      if (!res.ok) { cleanup(); reject(new Error(res.error)); }
    });
  });
}

let debounceTimer: number | null = null;

const ENABLED_KEY = 'side:intelligence.enabled';
const FEATURES_KEY = 'side:intelligence.features';

const DEFAULT_FEATURES: Record<IntelligenceFeature, boolean> = {
  autoTag: true,
  smartTitle: true,
  extractTodos: true,
  linkSuggestions: true,
  continueWriting: true,
};

function loadEnabled(): boolean {
  try { return localStorage.getItem(ENABLED_KEY) === '1'; } catch { return false; }
}

function loadFeatures(): Record<IntelligenceFeature, boolean> {
  try {
    const raw = localStorage.getItem(FEATURES_KEY);
    if (!raw) return DEFAULT_FEATURES;
    return { ...DEFAULT_FEATURES, ...JSON.parse(raw) };
  } catch { return DEFAULT_FEATURES; }
}

export const useNoteIntelligence = create<NoteIntelligenceState>((set, get) => ({
  enabled: loadEnabled(),
  features: loadFeatures(),
  activeRel: null,
  wordCount: 0,
  tags: null,
  title: null,
  todos: null,
  links: [],
  continuation: null,
  loading: new Set(),

  setEnabled(v) {
    localStorage.setItem(ENABLED_KEY, v ? '1' : '0');
    set({ enabled: v });
    if (!v) get().reset();
  },

  setFeature(f, v) {
    const features = { ...get().features, [f]: v };
    localStorage.setItem(FEATURES_KEY, JSON.stringify(features));
    set({ features });
  },

  analyzeContent(rel, content, allNotes) {
    const state = get();
    if (!state.enabled) return;

    if (rel !== state.activeRel) {
      set({ activeRel: rel, tags: null, title: null, todos: null, links: [], continuation: null });
    }

    const wc = countWords(content);
    set({ wordCount: wc });

    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      const s = get();
      if (!s.enabled || s.activeRel !== rel) return;
      runAnalysis(rel, content, wc, allNotes, s.features, set, get);
    }, DEBOUNCE_MS) as unknown as number;
  },

  onPause(rel, content) {
    const s = get();
    if (!s.enabled || !s.features.continueWriting) return;
    if (s.activeRel !== rel) return;
    if (s.continuation && !s.continuation.dismissed) return;
    if (countWords(content) < 20) return;

    set((prev) => ({ loading: new Set([...prev.loading, 'continueWriting' as IntelligenceFeature]) }));

    runAI(CONTINUE_SYSTEM, content)
      .then((raw) => {
        const text = raw.trim();
        if (text && get().activeRel === rel) {
          set({ continuation: { text, dismissed: false } });
        }
      })
      .catch(() => {})
      .finally(() => {
        set((prev) => {
          const next = new Set(prev.loading);
          next.delete('continueWriting');
          return { loading: next };
        });
      });
  },

  dismissTag() { set({ tags: get().tags ? { ...get().tags!, dismissed: true } : null }); },
  dismissTitle() { set({ title: get().title ? { ...get().title!, dismissed: true } : null }); },
  dismissTodos() { set({ todos: get().todos ? { ...get().todos!, dismissed: true } : null }); },
  dismissContinuation() { set({ continuation: get().continuation ? { ...get().continuation!, dismissed: true } : null }); },

  reset() {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    set({
      activeRel: null, wordCount: 0,
      tags: null, title: null, todos: null, links: [], continuation: null,
      loading: new Set(),
    });
  },
}));

async function runAnalysis(
  rel: string,
  content: string,
  wc: number,
  allNotes: NoteContext[],
  features: Record<IntelligenceFeature, boolean>,
  set: (fn: Partial<NoteIntelligenceState> | ((s: NoteIntelligenceState) => Partial<NoteIntelligenceState>)) => void,
  get: () => NoteIntelligenceState,
) {
  const jobs: Promise<void>[] = [];

  if (features.autoTag && wc >= MIN_WORDS_FOR_TAGS && !get().tags) {
    jobs.push((async () => {
      set((s) => ({ loading: new Set([...s.loading, 'autoTag' as IntelligenceFeature]) }));
      try {
        const raw = await runAI(TAG_SYSTEM, content);
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && get().activeRel === rel) {
          set({ tags: { tags: parsed.map(String), dismissed: false } });
        }
      } catch {}
      set((s) => { const n = new Set(s.loading); n.delete('autoTag'); return { loading: n }; });
    })());
  }

  const hasTitle = /^#\s+\S/.test(content.trim());
  if (features.smartTitle && wc >= MIN_WORDS_FOR_TITLE && !hasTitle && !get().title) {
    jobs.push((async () => {
      set((s) => ({ loading: new Set([...s.loading, 'smartTitle' as IntelligenceFeature]) }));
      try {
        const raw = await runAI(TITLE_SYSTEM, content);
        const title = raw.trim().replace(/^["']|["']$/g, '');
        if (title && get().activeRel === rel) {
          set({ title: { title, dismissed: false } });
        }
      } catch {}
      set((s) => { const n = new Set(s.loading); n.delete('smartTitle'); return { loading: n }; });
    })());
  }

  if (features.extractTodos && wc >= MIN_WORDS_FOR_TODOS && !get().todos) {
    jobs.push((async () => {
      set((s) => ({ loading: new Set([...s.loading, 'extractTodos' as IntelligenceFeature]) }));
      try {
        const raw = await runAI(TODO_SYSTEM, content);
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0 && get().activeRel === rel) {
          set({ todos: { items: parsed, dismissed: false } });
        }
      } catch {}
      set((s) => { const n = new Set(s.loading); n.delete('extractTodos'); return { loading: n }; });
    })());
  }

  if (features.linkSuggestions && wc >= MIN_WORDS_FOR_LINKS && get().links.length === 0) {
    jobs.push((async () => {
      set((s) => ({ loading: new Set([...s.loading, 'linkSuggestions' as IntelligenceFeature]) }));
      try {
        const otherNotes = allNotes
          .filter((n) => n.rel !== rel)
          .slice(0, 40)
          .map((n) => `- ${n.title} (${n.rel}) [${n.tags.join(', ')}]`)
          .join('\n');
        const prompt = `Current note:\n${content}\n\n---\nOther notes in vault:\n${otherNotes}`;
        const raw = await runAI(LINK_SYSTEM, prompt);
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && get().activeRel === rel) {
          set({ links: parsed });
        }
      } catch {}
      set((s) => { const n = new Set(s.loading); n.delete('linkSuggestions'); return { loading: n }; });
    })());
  }

  await Promise.allSettled(jobs);
}
