import { create } from 'zustand';

export interface Tip {
  body: React.ReactNode;
  /** Plain-text fallback used for the JSX-free string version (analytics, copy). */
  text: string;
}

// Kept JSX-free in the source — we render the highlights in the component.
export interface RawTip {
  text: string;
  /** Optional inline highlights — substrings to wrap. Keys can be 'kbd' (⌘K), 'code' ([[X]]), 'accent' (terracotta). */
  emphasize?: { match: string; kind: 'kbd' | 'code' | 'accent' }[];
}

export const TIPS: RawTip[] = [
  {
    text: 'Press ⌘K to search anything — notes, tags, or commands.',
    emphasize: [{ match: '⌘K', kind: 'kbd' }],
  },
  {
    text: 'Type [[ to link to another note. Pick one from the list or create a new one as you type.',
    emphasize: [{ match: '[[', kind: 'code' }],
  },
  {
    text: 'Press @ to mention a note, tag, or date like @today or @monday.',
    emphasize: [
      { match: '@', kind: 'code' },
      { match: '@today', kind: 'accent' },
      { match: '@monday', kind: 'accent' },
    ],
  },
  {
    text: '⌘1 for the editor, ⌘2 for the connections graph.',
    emphasize: [
      { match: '⌘1', kind: 'kbd' },
      { match: '⌘2', kind: 'kbd' },
    ],
  },
  {
    text: '⌘. enters focus mode — the sidebar steps aside so it is just you and the page.',
    emphasize: [{ match: '⌘.', kind: 'kbd' }],
  },
  {
    text: '⌘D opens today’s daily note, creating it if needed.',
    emphasize: [{ match: '⌘D', kind: 'kbd' }],
  },
  {
    text: 'Press / inside a note to insert blocks — headings, lists, code, tables, images.',
    emphasize: [{ match: '/', kind: 'code' }],
  },
  {
    text: 'Drag any note from the sidebar onto a canvas to embed it as a live card.',
  },
  {
    text: 'Hover a node in the graph and its neighbours stay bright. Everyone else fades.',
  },
  {
    text: 'Drag a note onto a folder to move it. Drag onto empty tree space to move to root.',
  },
  {
    text: 'Right-click any note or folder for Reveal in Finder, Duplicate, Rename, and more.',
  },
  {
    text: 'Type # then a space at the start of a line for a heading. ## for H2. ### for H3.',
    emphasize: [
      { match: '#', kind: 'code' },
      { match: '##', kind: 'code' },
      { match: '###', kind: 'code' },
    ],
  },
  {
    text: 'Drop an image into the editor — it saves into <vault>/assets and inserts inline.',
  },
  {
    text: '⌘/ shows every shortcut in one panel.',
    emphasize: [{ match: '⌘/', kind: 'kbd' }],
  },
  {
    text: 'Your notes are plain markdown on disk. Open them in any other editor any time.',
  },
  {
    text: 'Tags work everywhere — click any #tag to filter the sidebar.',
    emphasize: [{ match: '#tag', kind: 'accent' }],
  },
  {
    text: 'The graph colours notes by their top-level folder. Drag any node to reposition it.',
  },
  {
    text: 'Drop a markdown file into a `templates/` folder and it becomes a new-note template.',
    emphasize: [{ match: 'templates/', kind: 'code' }],
  },
  {
    text: 'Click "Today" in the sidebar to jump to your daily note. The streak chip shows your run.',
  },
];

const KEY_INDEX = 'tips.index.v1';
const KEY_DATE = 'tips.lastDate.v1';

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readIndex(): number {
  try {
    const v = localStorage.getItem(KEY_INDEX);
    if (v) return Math.max(0, Math.min(TIPS.length - 1, parseInt(v, 10)));
  } catch {
    /* ignore */
  }
  return 0;
}

function rolloverIfNewDay(idx: number): number {
  try {
    const last = localStorage.getItem(KEY_DATE);
    const today = todayYmd();
    if (last !== today) {
      localStorage.setItem(KEY_DATE, today);
      const next = (idx + 1) % TIPS.length;
      localStorage.setItem(KEY_INDEX, String(next));
      return next;
    }
  } catch {
    /* ignore */
  }
  return idx;
}

interface TipsState {
  index: number;
  next: () => void;
  current: () => RawTip;
}

export const useTips = create<TipsState>((set, get) => {
  const initial = rolloverIfNewDay(readIndex());
  return {
    index: initial,
    next: () => {
      const next = (get().index + 1) % TIPS.length;
      try {
        localStorage.setItem(KEY_INDEX, String(next));
      } catch {
        /* ignore */
      }
      set({ index: next });
    },
    current: () => TIPS[get().index],
  };
});
