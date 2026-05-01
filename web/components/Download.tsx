import { DOWNLOADS, RELEASES_URL } from '@/lib/links';

const platforms = [
  {
    name: 'macOS',
    arch: 'Apple Silicon',
    suffix: '.dmg',
    href: DOWNLOADS.macArm,
    glyph: 'apple',
  },
  {
    name: 'macOS',
    arch: 'Intel',
    suffix: '.dmg',
    href: DOWNLOADS.macIntel,
    glyph: 'apple',
  },
  {
    name: 'Windows',
    arch: '10 / 11 · x64',
    suffix: '.exe',
    href: DOWNLOADS.windows,
    glyph: 'windows',
  },
  {
    name: 'Linux',
    arch: 'AppImage · x64',
    suffix: '.AppImage',
    href: DOWNLOADS.linux,
    glyph: 'linux',
  },
];

export function Download() {
  return (
    <section id="download" className="px-6 py-24 bg-paper-2 border-y border-rule-soft">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-accent-ink mb-4">
            Get Side
          </div>
          <h2 className="font-serif text-[44px] md:text-[52px] leading-[1.05] tracking-[-0.025em] font-semibold mb-4">
            Pick your platform.
          </h2>
          <p className="font-serif text-[16px] leading-relaxed text-ink-2 max-w-xl mx-auto">
            All builds are unsigned for now — first launch on macOS may need a
            right-click → Open. Updates ship as new GitHub releases.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-rule rounded-[12px] overflow-hidden">
          {platforms.map((p, i) => (
            <a
              key={i}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-paper-2 hover:bg-paper p-7 flex flex-col items-start transition-colors"
            >
              <PlatformGlyph name={p.glyph} />
              <div className="mt-5 font-serif text-[20px] font-semibold tracking-tight text-ink">
                {p.name}
              </div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3 mt-1">
                {p.arch}
              </div>
              <div className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 group-hover:text-accent-ink transition-colors">
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M7 10l5 5 5-5" />
                  <path d="M12 15V3" />
                </svg>
                Download {p.suffix}
              </div>
            </a>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3 hover:text-ink transition-colors"
          >
            See all releases →
          </a>
        </div>
      </div>
    </section>
  );
}

function PlatformGlyph({ name }: { name: string }) {
  const common = {
    width: 26,
    height: 26,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.4',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'text-ink',
  };
  if (name === 'apple') {
    return (
      <svg {...common}>
        <path d="M16.5 8a4.5 4.5 0 0 1-3.5 4.4 5 5 0 0 0 .8 4.6 4.5 4.5 0 0 1-2.8 1.5 5 5 0 0 1-2 0 4.5 4.5 0 0 1-2.8-1.5C4.5 14.4 4 11 6 8.5A4 4 0 0 1 9.4 7c1 0 1.7.4 2.6.4S13 7 14 7a4 4 0 0 1 2.5 1Z" />
        <path d="M13 5c.5-.8 1.4-1.4 2.5-1.5a3 3 0 0 1-1 2.4 2.5 2.5 0 0 1-2 1A3 3 0 0 1 13 5Z" />
      </svg>
    );
  }
  if (name === 'windows') {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="8" height="8" />
        <rect x="13" y="4" width="8" height="8" />
        <rect x="3" y="14" width="8" height="8" />
        <rect x="13" y="14" width="8" height="8" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 4c-3 0-3 4-3 6 0 2-2 3-3 5-2 4 1 5 3 5h6c2 0 5-1 3-5-1-2-3-3-3-5 0-2 0-6-3-6Z" />
      <circle cx="10.5" cy="9.5" r=".7" />
      <circle cx="13.5" cy="9.5" r=".7" />
    </svg>
  );
}
