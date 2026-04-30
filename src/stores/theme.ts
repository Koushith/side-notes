import { create } from 'zustand';

export type ThemeKey = 'paper' | 'ink' | 'forest' | 'dusk' | 'carbon' | 'rose';
export type Mode = 'light' | 'dark';

export interface ThemeDef {
  name: string;
  swatch: [string, string, string]; // [bg, ink, accent] hexes for the picker dots
  light: Record<string, string>;
  dark: Record<string, string>;
}

/** Source palette from the Side design bundle (themes.jsx). Hex throughout. */
export const THEMES: Record<ThemeKey, ThemeDef> = {
  paper: {
    name: 'Paper',
    swatch: ['#f7f3ec', '#1f1d1a', '#c4623a'],
    light: {
      paper: '#f7f3ec', 'paper-2': '#f1ece3', 'paper-3': '#e8e2d6',
      ink: '#1f1d1a', 'ink-2': '#4a463f', 'ink-3': '#7a7468', 'ink-4': '#a8a294',
      rule: '#e0d9c8', 'rule-soft': '#ebe5d6',
      accent: '#c4623a', 'accent-soft': '#f0d8cb', 'accent-ink': '#8b3e1d',
      highlight: '#f5e4a8', link: '#4f6b8f',
      tag: '#5a7b56', 'tag-soft': '#dde6d8',
    },
    dark: {
      paper: '#1c1a17', 'paper-2': '#232120', 'paper-3': '#2c2926',
      ink: '#ece6da', 'ink-2': '#c2bcaf', 'ink-3': '#8c8678', 'ink-4': '#5e584e',
      rule: '#322f2a', 'rule-soft': '#2a2723',
      accent: '#d77752', 'accent-soft': '#4a2818', 'accent-ink': '#e8a486',
      highlight: '#4a3e1c', link: '#7a96bc',
      tag: '#88a584', 'tag-soft': '#2c3528',
    },
  },
  ink: {
    name: 'Ink',
    swatch: ['#fafaf9', '#0a0a0a', '#3b82f6'],
    light: {
      paper: '#fafaf9', 'paper-2': '#f4f4f3', 'paper-3': '#e8e8e6',
      ink: '#0a0a0a', 'ink-2': '#3a3a3a', 'ink-3': '#6e6e6e', 'ink-4': '#a0a0a0',
      rule: '#e2e2e0', 'rule-soft': '#ededeb',
      accent: '#2563eb', 'accent-soft': '#dbe6fb', 'accent-ink': '#1d4ed8',
      highlight: '#fef08a', link: '#2563eb',
      tag: '#475569', 'tag-soft': '#e2e8f0',
    },
    dark: {
      paper: '#0c0c0c', 'paper-2': '#161616', 'paper-3': '#222222',
      ink: '#f5f5f4', 'ink-2': '#c8c8c6', 'ink-3': '#8a8a88', 'ink-4': '#5a5a58',
      rule: '#262626', 'rule-soft': '#1d1d1d',
      accent: '#60a5fa', 'accent-soft': '#1e3a8a', 'accent-ink': '#93c5fd',
      highlight: '#3a3416', link: '#60a5fa',
      tag: '#94a3b8', 'tag-soft': '#1e293b',
    },
  },
  forest: {
    name: 'Forest',
    swatch: ['#f3f5f1', '#1a2418', '#3d6b4a'],
    light: {
      paper: '#f3f5f1', 'paper-2': '#eaeee6', 'paper-3': '#dee5d8',
      ink: '#1a2418', 'ink-2': '#3a4538', 'ink-3': '#6b7468', 'ink-4': '#9ba49a',
      rule: '#d4dccd', 'rule-soft': '#e0e7d8',
      accent: '#3d6b4a', 'accent-soft': '#d4e3d6', 'accent-ink': '#234a30',
      highlight: '#f0e5a8', link: '#5b7a8a',
      tag: '#9a7530', 'tag-soft': '#ece2cd',
    },
    dark: {
      paper: '#141a13', 'paper-2': '#1c2319', 'paper-3': '#252d22',
      ink: '#e6ebe1', 'ink-2': '#bcc4b6', 'ink-3': '#85907f', 'ink-4': '#525c4d',
      rule: '#2a3128', 'rule-soft': '#222820',
      accent: '#7ba884', 'accent-soft': '#1e3a26', 'accent-ink': '#a8cdac',
      highlight: '#3d3818', link: '#a0bccb',
      tag: '#c8a060', 'tag-soft': '#3a2e1a',
    },
  },
  dusk: {
    name: 'Dusk',
    swatch: ['#f5f1ec', '#2a1f1c', '#a64b2a'],
    light: {
      paper: '#f5f1ec', 'paper-2': '#ede6dc', 'paper-3': '#e0d6c7',
      ink: '#2a1f1c', 'ink-2': '#52443e', 'ink-3': '#867669', 'ink-4': '#b3a695',
      rule: '#dccdb8', 'rule-soft': '#e6dac6',
      accent: '#a64b2a', 'accent-soft': '#ecd1c2', 'accent-ink': '#7a3318',
      highlight: '#f3dba0', link: '#5b6f8a',
      tag: '#a08350', 'tag-soft': '#ebdec9',
    },
    dark: {
      paper: '#1a1411', 'paper-2': '#231b18', 'paper-3': '#2c2420',
      ink: '#f0e6dc', 'ink-2': '#c5b8aa', 'ink-3': '#8a7d6e', 'ink-4': '#5a4f43',
      rule: '#2e2620', 'rule-soft': '#241d18',
      accent: '#d27752', 'accent-soft': '#3e1f12', 'accent-ink': '#e9a187',
      highlight: '#3e3418', link: '#9aabbc',
      tag: '#c9a86e', 'tag-soft': '#3a2e1c',
    },
  },
  carbon: {
    name: 'Carbon',
    swatch: ['#1a1a1c', '#f0f0f2', '#a78bfa'],
    light: {
      // Carbon's "light" is intentionally a darker charcoal — lower contrast minimal mode.
      paper: '#1a1a1c', 'paper-2': '#222226', 'paper-3': '#2c2c30',
      ink: '#f0f0f2', 'ink-2': '#bdbdc2', 'ink-3': '#84848a', 'ink-4': '#54545a',
      rule: '#2e2e34', 'rule-soft': '#26262a',
      accent: '#a78bfa', 'accent-soft': '#2a1f4a', 'accent-ink': '#c4b1ff',
      highlight: '#3a3416', link: '#7dd3fc',
      tag: '#86efac', 'tag-soft': '#14322a',
    },
    dark: {
      paper: '#0a0a0c', 'paper-2': '#121214', 'paper-3': '#1a1a1d',
      ink: '#fafafa', 'ink-2': '#c8c8cc', 'ink-3': '#88888c', 'ink-4': '#56565a',
      rule: '#222226', 'rule-soft': '#1a1a1c',
      accent: '#c4b1ff', 'accent-soft': '#2a1f4a', 'accent-ink': '#d8c8ff',
      highlight: '#3a3416', link: '#7dd3fc',
      tag: '#86efac', 'tag-soft': '#14322a',
    },
  },
  rose: {
    name: 'Rose',
    swatch: ['#fbf6f4', '#1f1818', '#be3a5c'],
    light: {
      paper: '#fbf6f4', 'paper-2': '#f4ebe8', 'paper-3': '#ebdcd8',
      ink: '#1f1818', 'ink-2': '#4a3a3a', 'ink-3': '#7a6868', 'ink-4': '#a89a9a',
      rule: '#e2cfca', 'rule-soft': '#ebd9d3',
      accent: '#be3a5c', 'accent-soft': '#f4d2db', 'accent-ink': '#8a2240',
      highlight: '#fae8a8', link: '#5b6f8a',
      tag: '#7a8a5a', 'tag-soft': '#e0e6d0',
    },
    dark: {
      paper: '#1a1414', 'paper-2': '#231a1c', 'paper-3': '#2c2224',
      ink: '#ece2e2', 'ink-2': '#bcb0b0', 'ink-3': '#8a7c7c', 'ink-4': '#5a4e4e',
      rule: '#2e2426', 'rule-soft': '#241c1e',
      accent: '#e87598', 'accent-soft': '#3e1a26', 'accent-ink': '#f5a8be',
      highlight: '#3a3018', link: '#9aabbc',
      tag: '#a8c08a', 'tag-soft': '#2a3318',
    },
  },
};

const KEY_THEME = 'side.theme.v1';
const KEY_MODE = 'side.mode.v1';

function readTheme(): ThemeKey {
  try {
    const v = localStorage.getItem(KEY_THEME);
    if (v && v in THEMES) return v as ThemeKey;
  } catch {
    /* ignore */
  }
  return 'paper';
}

function readMode(): Mode {
  try {
    const v = localStorage.getItem(KEY_MODE);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* ignore */
  }
  return 'light';
}

function hexToRgb(hex: string): string {
  const m = hex.replace('#', '');
  if (m.length !== 6) return '0 0 0';
  const n = parseInt(m, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Apply the picked theme by setting our `--c-*` CSS vars to the design palette.
 *  We bridge the design's hex palette into the RGB-triple format Tailwind expects. */
export function applyTheme(themeKey: ThemeKey, mode: Mode) {
  const def = THEMES[themeKey];
  const palette = def[mode];
  const root = document.documentElement;
  const set = (cssVar: string, hex: string) => root.style.setProperty(cssVar, hexToRgb(hex));

  // Backgrounds
  set('--c-bg', palette.paper);
  set('--c-bg-elevated', palette['paper-2']);
  set('--c-bg-hover', palette['paper-3']);
  set('--c-bg-active', palette['paper-3']);

  // Text
  set('--c-text', palette.ink);
  set('--c-text-muted', palette['ink-3']);
  set('--c-text-subtle', palette['ink-4']);

  // Borders
  set('--c-border', palette.rule);
  set('--c-border-subtle', palette['rule-soft']);

  // Accent
  set('--c-accent', palette.accent);
  set('--c-accent-hover', palette.accent); // same accent; could darken if needed
  set('--c-accent-subtle', palette['accent-soft']);
  set('--c-accent-ink', palette['accent-ink']);

  // Tag / link
  set('--c-tag', palette.tag);
  set('--c-tag-soft', palette['tag-soft']);
  set('--c-tag-bg', palette['tag-soft']);
  set('--c-link', palette.link);
  set('--c-link-bg', palette['accent-soft']);
  set('--c-link-bg-hover', palette['accent-soft']);

  // Code / scroll / quote
  set('--c-code-bg', palette['paper-2']);
  set('--c-inline-code', palette.ink);
  set('--c-inline-code-bg', palette['paper-2']);
  set('--c-scroll-thumb', palette.rule);
  set('--c-scroll-thumb-hover', palette['ink-4']);
  set('--c-quote-border', palette.accent);
  set('--c-quote-text', palette['ink-2']);
  set('--c-highlight', palette.highlight);

  // Mark mode for components that conditionally render based on theme
  root.setAttribute('data-mode', mode);
  root.setAttribute('data-theme-name', themeKey);
}

interface ThemeState {
  theme: ThemeKey;
  mode: Mode;
  setTheme: (k: ThemeKey) => void;
  setMode: (m: Mode) => void;
  toggle: () => void;
}

export const useTheme = create<ThemeState>((set, get) => {
  const initialTheme = readTheme();
  const initialMode = readMode();
  applyTheme(initialTheme, initialMode);
  return {
    theme: initialTheme,
    mode: initialMode,
    setTheme: (theme) => {
      try {
        localStorage.setItem(KEY_THEME, theme);
      } catch {
        /* ignore */
      }
      applyTheme(theme, get().mode);
      set({ theme });
    },
    setMode: (mode) => {
      try {
        localStorage.setItem(KEY_MODE, mode);
      } catch {
        /* ignore */
      }
      applyTheme(get().theme, mode);
      set({ mode });
    },
    toggle: () => {
      const next: Mode = get().mode === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(KEY_MODE, next);
      } catch {
        /* ignore */
      }
      applyTheme(get().theme, next);
      set({ mode: next });
    },
  };
});
