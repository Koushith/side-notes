export function EditorMock() {
  return (
    <div className="absolute inset-0 flex flex-col bg-paper">
      {/* Title bar */}
      <div className="h-11 flex items-center px-4 border-b border-rule bg-paper gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-ink-3 ml-3">
          <span>Resources</span>
          <span className="text-ink-4">/</span>
          <span>Books</span>
          <span className="text-ink-4">/</span>
          <strong className="text-ink font-medium">Atomic Habits</strong>
        </div>
        <div className="ml-auto flex items-center gap-1 text-ink-3">
          <span className="w-7 h-7 grid place-items-center rounded-md hover:bg-paper-2">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6 6 4.5 4.5M19.5 19.5 18 18M6 18l-1.5 1.5M19.5 4.5 18 6" />
            </svg>
          </span>
          <span className="w-7 h-7 grid place-items-center rounded-md hover:bg-paper-2">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr] flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="bg-paper-2 border-r border-rule p-3 space-y-3">
          <div className="flex items-center gap-2.5 pb-3 border-b border-rule-soft">
            <span className="w-[22px] h-[22px] rounded-md bg-ink text-paper grid place-items-center font-serif font-semibold italic text-[13px]">S</span>
            <span className="font-serif font-semibold text-[15px]">obs-test</span>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">v0.1</span>
          </div>
          <div className="bg-paper border border-rule rounded-md px-2.5 py-1.5 flex items-center gap-2 text-ink-3 text-[12px]">
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="flex-1">Search…</span>
            <kbd className="font-mono text-[10px] px-1 rounded bg-paper-3 border border-rule">⌘K</kbd>
          </div>
          <ul className="space-y-0.5 text-[12.5px] text-ink-2">
            <li className="flex items-center gap-2 px-2 py-1.5 rounded-md text-ink font-medium bg-paper-3">
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 3v2M12 19v2M5 12H3M21 12h-2" />
              </svg>
              Today
            </li>
            <li className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-paper-3">
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 4v16a2 2 0 0 0 2 2h14V2H6a2 2 0 0 0-2 2z" />
              </svg>
              All notes
              <span className="ml-auto font-mono text-[10px] text-ink-4">428</span>
            </li>
            <li className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-paper-3">
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="6" cy="18" r="2.5" />
                <circle cx="18" cy="18" r="2.5" />
                <circle cx="12" cy="6" r="2.5" />
                <path d="m11 8-4 8M13 8l4 8M8 18h8" />
              </svg>
              Connections
            </li>
            <li className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-paper-3">
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <rect x="6" y="6" width="5" height="5" rx="0.5" />
                <rect x="13" y="13" width="5" height="5" rx="0.5" />
              </svg>
              Canvas
            </li>
          </ul>
          <div className="pt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-4">My vault</div>
          <ul className="text-[12.5px] text-ink-2 space-y-0.5">
            <li className="flex items-center gap-2 py-1 px-1 rounded text-ink font-medium">
              <span className="w-2 text-ink-4">▾</span>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              Resources
            </li>
            <li className="flex items-center gap-2 py-1 pl-7 rounded">
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5" />
              </svg>
              Building a Second Brain
            </li>
            <li className="flex items-center gap-2 py-1 pl-7 rounded bg-accent-soft text-accent-ink font-medium">
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5" />
              </svg>
              Atomic Habits
            </li>
            <li className="flex items-center gap-2 py-1 pl-7 rounded">
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5" />
              </svg>
              Deep Work
            </li>
          </ul>
          <div className="pt-3 mt-3 border-t border-rule-soft">
            <span className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full bg-tag-soft text-tag text-[10.5px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-tag" />
              Saved on your Mac
            </span>
          </div>
        </aside>

        {/* Document */}
        <article className="px-12 pt-10 pb-12 bg-paper overflow-hidden">
          <h1 className="font-serif text-[36px] font-semibold tracking-[-0.02em] leading-[1.15] text-ink mb-2.5">
            Atomic Habits
          </h1>
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 mb-8 flex items-center gap-2">
            <span>Resources/Books/Atomic Habits.md</span>
            <span className="text-ink-4">·</span>
            <span>3 tags</span>
          </div>

          <p className="font-serif text-[16px] leading-[1.7] text-ink mb-3">
            <strong className="font-semibold">James Clear</strong> · ★★★★★ ·
            finished Jan 2026
          </p>
          <p className="font-serif text-[16px] leading-[1.7] text-ink mb-5">
            Re-read. The 1% framing is famous but the <em>implementation</em>{' '}
            chapters are the gold.
          </p>

          <h2 className="font-serif text-[22px] font-semibold leading-[1.25] mt-7 mb-2">
            Where I&apos;m applying it
          </h2>
          <ul className="font-serif text-[16px] leading-[1.7] text-ink space-y-1 list-disc pl-6 mb-5">
            <li>
              <a className="text-accent-ink bg-accent-soft px-1 rounded border-b border-accent no-underline">
                [[Sleep Routine]]
              </a>{' '}
              — tied bedtime to a specific cue (phone airplane mode)
            </li>
            <li>
              <a className="text-accent-ink bg-accent-soft px-1 rounded border-b border-accent no-underline">
                [[Marathon Training]]
              </a>{' '}
              — daily run is identity, not a chore
            </li>
            <li>
              <a className="text-accent-ink bg-accent-soft px-1 rounded border-b border-accent no-underline">
                [[Budget 2026]]
              </a>{' '}
              — automated savings, no willpower needed
            </li>
          </ul>

          <p className="font-serif italic text-[15px] leading-[1.65] text-ink-2 border-l-[3px] border-accent pl-4 my-5">
            &quot;You do not rise to the level of your goals, you fall to the level of your systems.&quot;
          </p>

          <div className="flex flex-wrap gap-1.5 mt-6">
            <span className="font-mono text-[12px] text-tag bg-tag-soft px-1.5 py-[1px] rounded">#book</span>
            <span className="font-mono text-[12px] text-tag bg-tag-soft px-1.5 py-[1px] rounded">#habits</span>
            <span className="font-mono text-[12px] text-tag bg-tag-soft px-1.5 py-[1px] rounded">#productivity</span>
          </div>
        </article>
      </div>
    </div>
  );
}
