// Mirrors the Carbon · dark palette from src/stores/theme.ts so the video reads as
// "this is the SideNotes app." Keep in sync if Carbon changes.

export const COLORS = {
  bg: '#0a0a0c',
  bgElevated: '#121214',
  bgHover: '#1a1a1d',
  text: '#fafafa',
  textMuted: '#88888c',
  textSubtle: '#56565a',
  border: '#222226',
  borderSubtle: '#1a1a1c',
  accent: '#c4b1ff',
  accentSubtle: '#2a1f4a',
  accentInk: '#d8c8ff',
  tag: '#86efac',
  tagSoft: '#14322a',
  link: '#7dd3fc',
};

export const FONTS = {
  // Clean, modern system fonts — no serif, all sans for that crisp Granola-style aesthetic.
  // Remotion uses system fallbacks to avoid bundler deps.
  serif: '-apple-system, BlinkMacSystemFont, system-ui, "SF Pro Display", "Segoe UI", sans-serif',
  sans: '-apple-system, BlinkMacSystemFont, system-ui, "SF Pro Text", "Segoe UI", sans-serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, monospace',
};
