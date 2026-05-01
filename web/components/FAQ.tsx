const items = [
  {
    q: 'What does it cost?',
    a: 'Nothing. Side is free and open source — MIT licensed. If you want to support it, star the repo or open a thoughtful issue.',
  },
  {
    q: 'Is there a Windows / Linux build?',
    a: 'Yes — pick your platform from the Download section. macOS gets the most testing; Windows and Linux builds come from the same CI pipeline but have less mileage. Bug reports welcome.',
  },
  {
    q: 'How do I sync notes across devices?',
    a: "Side is local-first by design — point your vault at any folder you already sync (iCloud Drive, Dropbox, Syncthing, a USB stick). The app doesn't run a sync service; we don't want to.",
  },
  {
    q: 'Will my files work in Obsidian?',
    a: "Yes. Notes are plain markdown with [[wikilinks]] and #tags. Canvas files use Obsidian's .canvas JSON format. You can switch in either direction without exporting anything.",
  },
  {
    q: 'Are there plugins?',
    a: 'Not in v0.1. The roadmap leaves room for them, but the goal is to ship the right defaults first — slash menu, graph, canvas, daily notes — instead of pushing customisation onto you.',
  },
  {
    q: 'Is my data sent anywhere?',
    a: 'No. There is no telemetry, no analytics, no auto-update phone-home. The app reads and writes files in the folder you picked. That is the entire surface area.',
  },
];

export function FAQ() {
  return (
    <section id="faq" className="px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-accent-ink mb-4">
            Questions
          </div>
          <h2 className="font-serif text-[44px] md:text-[52px] leading-[1.05] tracking-[-0.025em] font-semibold mb-4">
            Honest answers.
          </h2>
        </div>

        <div className="divide-y divide-rule">
          {items.map((it, i) => (
            <details key={i} className="group py-5">
              <summary className="flex items-start justify-between gap-6 cursor-pointer list-none">
                <span className="font-serif text-[18px] font-semibold text-ink leading-snug">
                  {it.q}
                </span>
                <span className="shrink-0 mt-1 text-ink-3 group-open:rotate-45 transition-transform">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 font-serif text-[16px] leading-[1.7] text-ink-2 max-w-prose">
                {it.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
