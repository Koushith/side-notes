export function DailyMock() {
  return (
    <div className="absolute inset-0 flex flex-col bg-paper">
      <div className="h-11 flex items-center px-4 border-b border-rule bg-paper gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-ink-3 ml-3">
          <span>Daily Notes</span>
          <span className="text-ink-4">/</span>
          <strong className="text-ink font-medium">Friday, May 1</strong>
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
                <circle cx="12" cy="12" r="4" />
                <path d="M12 3v2M12 19v2" />
              </svg>
              Today
            </li>
          </ul>
          <div className="pt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-4">Daily notes</div>
          <ul className="space-y-0.5 text-[12.5px]">
            <li className="flex items-center gap-2 py-1 pl-7 rounded bg-accent-soft text-accent-ink font-medium">
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              </svg>
              2026-05-01
            </li>
            <li className="flex items-center gap-2 py-1 pl-7 rounded">
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              </svg>
              2026-04-30
            </li>
          </ul>
        </aside>

        <article className="px-12 pt-8 pb-6 bg-paper overflow-hidden">
          <div className="flex items-start gap-6 pb-5 mb-5 border-b border-rule">
            <div className="w-[68px] shrink-0 text-center font-serif">
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">Fri</div>
              <div className="text-[44px] font-semibold leading-none tracking-[-0.03em] my-0.5 text-ink">01</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">May 26</div>
            </div>
            <div className="flex-1 pt-1">
              <h1 className="font-serif text-[24px] font-semibold tracking-[-0.02em] leading-[1.15] text-ink mb-2.5">
                Shipped the index migration.
              </h1>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full bg-paper-2 border border-rule font-sans text-[10.5px] font-medium text-ink-2">
                  <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M17 18a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1A4 4 0 0 0 6 19h11" />
                  </svg>
                  63°F · overcast
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full bg-paper-2 border border-rule font-sans text-[10.5px] font-medium text-ink-2">
                  <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M3 9h18M8 3v4M16 3v4" />
                  </svg>
                  3 meetings
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full bg-accent-soft border border-accent text-accent-ink font-sans text-[10.5px] font-medium">
                  <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M14 5l-2 2c-3 3-3 8 0 11l2 2" />
                    <path d="M14 5l-2 2c-3 3-3 8 0 11" />
                  </svg>
                  12-day streak
                </span>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3 mb-1.5">How am I, today?</div>
            <div className="flex gap-1.5">
              {['drained', 'low', 'okay', 'good', 'wired'].map((m) => (
                <span
                  key={m}
                  className={`flex-1 text-center py-1.5 rounded-md font-serif text-[11px] lowercase ${
                    m === 'good'
                      ? 'bg-accent-soft border border-accent font-semibold text-accent-ink'
                      : 'bg-paper-2 border border-rule text-ink-3'
                  }`}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-4 px-3 pt-2.5 pb-2 bg-paper-2 border border-rule rounded-[8px]">
            <div className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3 mb-1.5">
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              <span>Yesterday&apos;s loose ends</span>
              <span className="ml-auto text-ink-4 normal-case">auto-pulled</span>
            </div>
            <div className="space-y-1 font-serif text-[12px]">
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 mt-[3px] rounded-[3px] border border-ink-3" />
                Review Sam&apos;s PR on the events table migration
              </div>
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 mt-[3px] rounded-[3px] border border-ink-3" />
                Reply to the on-call rotation thread
              </div>
              <div className="flex items-start gap-2 text-ink-3">
                <span className="w-3 h-3 mt-[3px] rounded-[3px] bg-ink-3 grid place-items-center">
                  <svg width={7} height={7} viewBox="0 0 24 24" fill="none" stroke="#f7f3ec" strokeWidth="3">
                    <path d="m5 12 5 5 9-12" />
                  </svg>
                </span>
                <span className="line-through">Finish DDIA chapter 3</span>
              </div>
            </div>
          </div>

          <h2 className="font-serif text-[16px] font-semibold tracking-tight text-ink mb-1">Morning thoughts</h2>
          <p className="font-serif text-[12.5px] leading-[1.6] text-ink">
            The migration ran clean overnight — 14 minutes for the
            <code className="font-mono text-[11px] bg-paper-2 px-1 rounded mx-0.5">CREATE INDEX CONCURRENTLY</code>
            on a 240M-row table. p99 on the dashboard query is now 38ms, down from 4.2s.
          </p>
        </article>
      </div>
    </div>
  );
}
