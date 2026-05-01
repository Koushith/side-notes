import { ISSUES_URL, REPO_URL } from '@/lib/links';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="px-6 py-14 border-t border-rule-soft">
      <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-start md:items-center gap-6">
        <a href="/" className="flex items-center gap-2.5">
          <span className="w-[26px] h-[26px] rounded-md bg-ink text-paper grid place-items-center font-serif font-semibold italic text-[15px]">
            S
          </span>
          <span className="font-serif text-[17px] font-semibold tracking-tight">Side</span>
        </a>
        <div className="font-serif text-[14px] text-ink-3 max-w-md">
          A quiet, local-first second brain. Plain markdown, on your Mac.
        </div>
        <div className="md:ml-auto flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
            GitHub
          </a>
          <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
            Issues
          </a>
          <a href="#faq" className="hover:text-ink">
            Questions
          </a>
        </div>
      </div>
      <div className="mx-auto max-w-6xl mt-10 pt-6 border-t border-rule-soft flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-4">
        <span>© {year} Side · MIT</span>
        <span className="inline-flex items-center gap-1.5 text-tag normal-case font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-tag" />
          Saved on your Mac
        </span>
      </div>
    </footer>
  );
}
