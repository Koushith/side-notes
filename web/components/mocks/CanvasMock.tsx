export function CanvasMock() {
  return (
    <div className="absolute inset-0 flex flex-col bg-paper">
      <div className="h-11 flex items-center px-4 border-b border-rule bg-paper gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-ink-3 ml-3">
          <span>Canvases</span>
          <span className="text-ink-4">/</span>
          <strong className="text-ink font-medium">Q2 2026 Plan</strong>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr] flex-1 min-h-0">
        <aside className="bg-paper-2 border-r border-rule p-3 space-y-2 text-[12.5px] text-ink-2">
          <div className="flex items-center gap-2.5 pb-3 border-b border-rule-soft">
            <span className="w-[22px] h-[22px] rounded-md bg-ink text-paper grid place-items-center font-serif font-semibold italic text-[13px]">S</span>
            <span className="font-serif font-semibold text-[15px]">obs-test</span>
          </div>
          <ul className="space-y-0.5">
            <li className="flex items-center gap-2 px-2 py-1.5 rounded-md text-ink font-medium bg-paper-3">
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <rect x="6" y="6" width="5" height="5" rx="0.5" />
                <rect x="13" y="13" width="5" height="5" rx="0.5" />
              </svg>
              Canvas
            </li>
          </ul>
          <div className="pt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-4">Canvases</div>
          <ul className="space-y-0.5">
            <li className="flex items-center gap-2 py-1 pl-7 rounded bg-accent-soft text-accent-ink font-medium">
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
              Q2 2026 Plan
            </li>
          </ul>
        </aside>

        <div
          className="relative bg-paper-2 overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(rgba(31,29,26,0.08) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          <div className="absolute top-3 left-3 flex gap-2 z-10">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-paper/90 backdrop-blur border border-rule text-[12px] text-ink-3">
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
              Text card
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-paper/90 backdrop-blur border border-rule text-[12px] text-ink-3">
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5" />
              </svg>
              Note card
              <span className="font-mono text-[10px]">+</span>
            </span>
          </div>

          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <path d="M 50 18 C 50 28, 26 28, 26 36" stroke="#c4623a" strokeWidth="0.35" fill="none" />
            <path d="M 50 18 C 50 28, 50 28, 50 36" stroke="#c4623a" strokeWidth="0.35" fill="none" />
            <path d="M 50 18 C 50 28, 75 28, 75 36" stroke="#c4623a" strokeWidth="0.35" fill="none" />
            <path d="M 50 50 C 50 60, 32 62, 32 70" stroke="#c4623a" strokeWidth="0.35" fill="none" />
            <path d="M 50 50 C 50 60, 50 62, 50 70" stroke="#c4623a" strokeWidth="0.35" fill="none" />
            <path d="M 32 78 C 32 82, 50 82, 50 78" stroke="#c4623a" strokeWidth="0.35" fill="none" />
          </svg>

          <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[34%] rounded-[10px] bg-paper-2 border border-rule shadow-md overflow-hidden">
            <div className="flex items-center justify-between px-2.5 py-1 bg-paper border-b border-rule">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">Text</span>
            </div>
            <div className="p-2.5 font-serif text-[10.5px] leading-snug text-ink">
              Q2 2026 — Three big bets:
              <br />1. Ship the Second Brain MVP
              <br />2. Hit 50mpw running consistently
              <br />3. Launch photography portfolio
            </div>
          </div>

          {[
            { left: '8%', title: 'Second Brain App', body: 'Building a Notion-easy, Obsidian-deep notes app for non-tech folks…' },
            { left: '50%', title: 'Marathon Training', body: 'Berlin Marathon in September. 18-week Pfitzinger plan, peaks at 55 miles…' },
            { right: '8%', title: 'Photography Portfolio', body: 'Personal site, launch by Q3. Themes: street, travel, portraits…' },
          ].map((c, i) => (
            <div
              key={i}
              className="absolute top-[36%] w-[26%] rounded-[10px] bg-paper-2 border border-rule shadow-md overflow-hidden"
              style={{
                left: c.left ?? undefined,
                right: c.right ?? undefined,
                transform: c.left === '50%' ? 'translateX(-50%)' : undefined,
              }}
            >
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-paper border-b border-rule">
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#4f6b8f" strokeWidth="1.6">
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                </svg>
                <span className="font-serif text-[11px] font-semibold text-ink">{c.title}</span>
              </div>
              <div className="p-2.5 font-serif text-[10px] leading-snug text-ink-3">{c.body}</div>
            </div>
          ))}

          <div className="absolute top-[70%] left-[16%] w-[20%] rounded-[10px] bg-paper-2 border border-rule shadow-md overflow-hidden">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-paper border-b border-rule">
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#4f6b8f" strokeWidth="1.6">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              </svg>
              <span className="font-serif text-[10.5px] font-semibold text-ink">Workout Plan</span>
            </div>
            <div className="p-2 font-serif text-[9.5px] leading-snug text-ink-3">Strength + mobility split.</div>
          </div>
          <div className="absolute top-[70%] left-1/2 -translate-x-1/2 w-[20%] rounded-[10px] bg-paper-2 border border-rule shadow-md overflow-hidden">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-paper border-b border-rule">
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#4f6b8f" strokeWidth="1.6">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              </svg>
              <span className="font-serif text-[10.5px] font-semibold text-ink">Sleep Routine</span>
            </div>
            <div className="p-2 font-serif text-[9.5px] leading-snug text-ink-3">Phone airplane mode at 9:30.</div>
          </div>

          <div className="absolute bottom-3 right-3 w-28 h-20 rounded-md bg-paper-2 border border-rule overflow-hidden">
            <svg viewBox="0 0 100 70" className="w-full h-full">
              <rect x="38" y="6" width="24" height="10" rx="1" fill="#4a463f" />
              <rect x="6" y="26" width="20" height="10" rx="1" fill="#4f6b8f" />
              <rect x="40" y="26" width="20" height="10" rx="1" fill="#4f6b8f" />
              <rect x="74" y="26" width="20" height="10" rx="1" fill="#4f6b8f" />
              <rect x="14" y="50" width="16" height="8" rx="1" fill="#4a463f" />
              <rect x="42" y="50" width="16" height="8" rx="1" fill="#4a463f" />
              <rect x="0" y="0" width="100" height="70" fill="rgba(247,243,236,0.45)" />
              <rect x="20" y="14" width="60" height="42" stroke="#c4623a" strokeWidth="1" fill="none" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
