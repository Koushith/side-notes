import { Glyph } from './Glyph';

const features = [
  {
    eyebrow: 'Editor',
    title: 'Notion-easy. Markdown-deep.',
    body: 'Slash menu for blocks, drag handles, tables, code with syntax highlighting. Every keystroke saves a plain .md file you can open anywhere — vim, BBEdit, the next decade.',
    glyph: 'pen' as const,
  },
  {
    eyebrow: 'Linking',
    title: 'Type [[ to connect ideas.',
    body: 'Wikilink autocomplete with a real picker. Type @ for a unified note + tag + date mention. Backlinks panel always visible. The graph colours nodes by folder so structure is readable at a glance.',
    glyph: 'link' as const,
  },
  {
    eyebrow: 'Local first',
    title: 'Your files stay yours.',
    body: 'Pick any folder on your Mac — that is your vault. No accounts, no sync conflicts, no pricing tier locking your notes. Move it to iCloud Drive or Syncthing if you want sync. Your call.',
    glyph: 'lock' as const,
  },
  {
    eyebrow: 'Spatial',
    title: 'Canvas for visual thinking.',
    body: 'Drag notes onto an infinite whiteboard. Connect cards. Resize. The canvas saves as JSON next to your notes — Obsidian-compatible if you ever want to switch.',
    glyph: 'grid' as const,
  },
  {
    eyebrow: 'Daily notes',
    title: 'Show up, every day.',
    body: "Press ⌘D for today. The masthead pulls weather, mood, streak, and yesterday's loose ends — so journaling has momentum even on tired days.",
    glyph: 'calendar' as const,
  },
  {
    eyebrow: 'Six themes',
    title: 'Read in the right light.',
    body: 'Paper, Ink, Forest, Dusk, Carbon, Rose. Each in light + dark. Built on CSS custom props, so the editor, the graph, and the canvas all change at once.',
    glyph: 'palette' as const,
  },
];

export function Features() {
  return (
    <section id="features" className="px-6 py-24 bg-paper-2 border-y border-rule-soft">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl mb-16">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-accent-ink mb-4">
            Why Side
          </div>
          <h2 className="font-serif text-[44px] md:text-[52px] leading-[1.05] tracking-[-0.025em] font-semibold mb-5">
            Calm tools for thinking, not chasing.
          </h2>
          <p className="font-serif text-[18px] leading-relaxed text-ink-2">
            Most notes apps want to live in the cloud, surface notifications, and
            become a job. Side does the opposite — it stays on your computer,
            keeps your notes in plain text, and gets quiet when you start typing.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-px bg-rule rounded-[12px] overflow-hidden">
          {features.map((f) => (
            <div key={f.title} className="bg-paper-2 p-9">
              <div className="flex items-center gap-2 mb-4">
                <Glyph name={f.glyph} />
                <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
                  {f.eyebrow}
                </div>
              </div>
              <h3 className="font-serif text-[22px] font-semibold leading-[1.25] tracking-tight mb-2.5">
                {f.title}
              </h3>
              <p className="font-serif text-[15px] leading-[1.7] text-ink-2">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
