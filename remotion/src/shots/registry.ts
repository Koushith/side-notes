// One config per shot — wired to one screenshot from public/shots/raw/.
// Add or reorder freely; render-all loops over this list.

export interface ShotConfig {
  id: string;             // composition id + output filename
  src: string;            // static path under public/
  eyebrow: string;
  title: string;
  subtitle?: string;
  tone?: 'accent' | 'tag' | 'link';
}

export const SHOTS: ShotConfig[] = [
  {
    id: 'shot-hero',
    src: 'shots/raw/01-hero.png',
    eyebrow: 'A second brain on your Mac',
    title: 'Quiet, fast, plain markdown.',
    subtitle: 'Your notes stay yours — every one of them, a real file on disk.',
    tone: 'accent',
  },
  {
    id: 'shot-daily',
    src: 'shots/raw/02-daily.png',
    eyebrow: 'Daily notes',
    title: "Yesterday rolls into today.",
    subtitle: 'Streaks, mood, carry-forward tasks — built in.',
    tone: 'link',
  },
  {
    id: 'shot-grouping-collapsed',
    src: 'shots/raw/03a-grouping-collapsed.png',
    eyebrow: 'Sidebar at rest',
    title: 'Stays tidy by default.',
    subtitle: 'Only this month is open. Older months wait one click away.',
    tone: 'accent',
  },
  {
    id: 'shot-grouping-expanded',
    src: 'shots/raw/03b-grouping-expanded.png',
    eyebrow: 'Sidebar expanded',
    title: 'Year / Month grouping.',
    subtitle: 'Purely visual — files stay flat on disk so iCloud, Dropbox, and git see nothing.',
    tone: 'accent',
  },
  {
    id: 'shot-todo',
    src: 'shots/raw/04-todo.png',
    eyebrow: 'Todo notes',
    title: 'Tick things off. Watch the bar fill.',
    subtitle: 'Any /todos/ folder gets a real header with live progress.',
    tone: 'tag',
  },
  {
    id: 'shot-mermaid',
    src: 'shots/raw/05-mermaid.png',
    eyebrow: 'Flowcharts',
    title: 'Type a diagram. See it drawn.',
    subtitle: 'Mermaid blocks render live, themed to the active palette.',
    tone: 'link',
  },
  {
    id: 'shot-graph',
    src: 'shots/raw/06-graph.png',
    eyebrow: 'Graph view',
    title: 'Watch your notes connect.',
    subtitle: 'Wikilinks, tags, and folders fold into one navigable map.',
    tone: 'link',
  },
  {
    id: 'shot-palette',
    src: 'shots/raw/07-palette.png',
    eyebrow: '⌘K',
    title: 'Jump anywhere.',
    subtitle: 'Files, commands, recent edits — all one keystroke away.',
    tone: 'accent',
  },
  {
    id: 'shot-allnotes',
    src: 'shots/raw/08-allnotes.png',
    eyebrow: 'Every note',
    title: 'One vault. All your thinking.',
    subtitle: 'Search, filter, jump. No accounts, no cloud, no fuss.',
    tone: 'accent',
  },
  {
    id: 'shot-dialog',
    src: 'shots/raw/09-dialog.png',
    eyebrow: 'Friendlier popups',
    title: 'Native dialogs, themed.',
    subtitle: 'No more system grey. Every prompt feels at home in the app.',
    tone: 'accent',
  },
  {
    id: 'shot-onboarding',
    src: 'shots/raw/10-onboarding.png',
    eyebrow: 'First run',
    title: 'A quiet welcome.',
    subtitle: 'Four cards, then out of the way. No accounts, no tour-jail.',
    tone: 'link',
  },
  {
    id: 'shot-theme',
    src: 'shots/raw/11-theme.png',
    eyebrow: 'Six themes',
    title: 'Pick a mood.',
    subtitle: 'Paper, Ink, Forest, Dusk, Carbon, Rose. Light and dark for each.',
    tone: 'accent',
  },
  {
    id: 'shot-canvas',
    src: 'shots/raw/12-canvas.png',
    eyebrow: 'Canvas',
    title: 'Whiteboard your thinking.',
    subtitle: 'Sticky notes, text cards, note refs, and arrows between them.',
    tone: 'tag',
  },
  {
    id: 'shot-journal',
    src: 'shots/raw/13-journal.png',
    eyebrow: 'Long-form',
    title: 'A clean room for writing.',
    subtitle: 'Serif body, soft chrome, every link and tag at home in the prose.',
    tone: 'link',
  },
  {
    id: 'shot-todo-project',
    src: 'shots/raw/14-todo-project.png',
    eyebrow: 'Project todos',
    title: 'Now · Next · Later · Done.',
    subtitle: 'Same header chrome for project lists — no date, just priorities.',
    tone: 'tag',
  },
];
