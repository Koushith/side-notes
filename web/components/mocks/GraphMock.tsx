export function GraphMock() {
  return (
    <div className="absolute inset-0 flex flex-col bg-paper">
      <div className="h-11 flex items-center px-4 border-b border-rule bg-paper gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-ink-3 ml-3">
          <strong className="text-ink font-medium">Connections</strong>
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
                <circle cx="6" cy="18" r="2.5" />
                <circle cx="18" cy="18" r="2.5" />
                <circle cx="12" cy="6" r="2.5" />
                <path d="m11 8-4 8M13 8l4 8M8 18h8" />
              </svg>
              Connections
            </li>
          </ul>
        </aside>

        <div className="relative bg-paper">
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-md bg-paper-2/80 backdrop-blur border border-rule font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            428 notes · 1,204 links
          </div>

          <div className="absolute top-4 right-4 rounded-md bg-paper-2/85 backdrop-blur border border-rule px-3 py-2 text-[11px] text-ink-2 space-y-1.5">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3">Folders</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent" />Resources<span className="ml-auto text-ink-4 font-mono text-[10px]">12</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-tag" />Areas<span className="ml-auto text-ink-4 font-mono text-[10px]">8</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-link" />Projects<span className="ml-auto text-ink-4 font-mono text-[10px]">6</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#9a7530' }} />Daily<span className="ml-auto text-ink-4 font-mono text-[10px]">22</span></div>
          </div>

          <svg viewBox="0 0 600 380" className="w-full h-full">
            <g stroke="#e0d9c8" strokeWidth="0.9" fill="none">
              <line x1="300" y1="120" x2="200" y2="180" />
              <line x1="300" y1="120" x2="380" y2="170" />
              <line x1="300" y1="120" x2="290" y2="200" />
              <line x1="200" y1="180" x2="155" y2="240" />
              <line x1="200" y1="180" x2="290" y2="200" />
              <line x1="380" y1="170" x2="290" y2="200" />
              <line x1="380" y1="170" x2="450" y2="220" />
              <line x1="290" y1="200" x2="240" y2="265" />
              <line x1="290" y1="200" x2="350" y2="265" />
              <line x1="155" y1="240" x2="120" y2="295" />
              <line x1="155" y1="240" x2="240" y2="265" />
              <line x1="450" y1="220" x2="490" y2="280" />
              <line x1="240" y1="265" x2="350" y2="265" />
              <line x1="350" y1="265" x2="425" y2="310" />
              <line x1="490" y1="280" x2="425" y2="310" />
              <line x1="120" y1="295" x2="200" y2="335" />
              <line x1="240" y1="265" x2="200" y2="335" />
              <line x1="200" y1="335" x2="305" y2="320" />
              <line x1="305" y1="320" x2="425" y2="310" />
              <line x1="305" y1="320" x2="350" y2="265" />
              <line x1="380" y1="170" x2="490" y2="160" />
              <line x1="490" y1="160" x2="490" y2="280" />
            </g>
            <g>
              <circle cx="300" cy="120" r="11" fill="#5a7b56" />
              <text x="300" y="106" textAnchor="middle" fontFamily="Source Serif 4" fontSize="11" fill="#1f1d1a">Atomic Habits</text>
              <circle cx="200" cy="180" r="8" fill="#c4623a" />
              <text x="200" y="167" textAnchor="middle" fontFamily="Source Serif 4" fontSize="10" fill="#1f1d1a">Sleep Routine</text>
              <circle cx="380" cy="170" r="9" fill="#4f6b8f" />
              <text x="380" y="157" textAnchor="middle" fontFamily="Source Serif 4" fontSize="10" fill="#1f1d1a">Building a Second Brain</text>
              <circle cx="290" cy="200" r="10" fill="#5a7b56" />
              <text x="290" y="222" textAnchor="middle" fontFamily="Source Serif 4" fontSize="10" fill="#1f1d1a">Workout Plan</text>
              <circle cx="155" cy="240" r="6" fill="#c4623a" />
              <text x="135" y="244" textAnchor="end" fontFamily="Source Serif 4" fontSize="9.5" fill="#4a463f">Marathon</text>
              <circle cx="450" cy="220" r="7" fill="#4f6b8f" />
              <text x="466" y="224" textAnchor="start" fontFamily="Source Serif 4" fontSize="9.5" fill="#4a463f">Deep Work</text>
              <circle cx="240" cy="265" r="6" fill="#9a7530" />
              <text x="218" y="270" textAnchor="end" fontFamily="Source Serif 4" fontSize="9" fill="#4a463f">2026-04-30</text>
              <circle cx="350" cy="265" r="6" fill="#9a7530" />
              <text x="372" y="270" textAnchor="start" fontFamily="Source Serif 4" fontSize="9" fill="#4a463f">2026-04-29</text>
              <circle cx="490" cy="280" r="5" fill="#4f6b8f" />
              <circle cx="120" cy="295" r="5" fill="#a8a294" />
              <circle cx="200" cy="335" r="6" fill="#c4623a" />
              <text x="200" y="356" textAnchor="middle" fontFamily="Source Serif 4" fontSize="9.5" fill="#4a463f">Nutrition Basics</text>
              <circle cx="305" cy="320" r="7" fill="#5a7b56" />
              <text x="305" y="341" textAnchor="middle" fontFamily="Source Serif 4" fontSize="9.5" fill="#4a463f">Budget 2026</text>
              <circle cx="425" cy="310" r="5" fill="#4f6b8f" />
              <circle cx="490" cy="160" r="5" fill="#9a7530" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
