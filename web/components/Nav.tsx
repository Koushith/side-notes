import { LATEST_RELEASE_URL, REPO_URL } from '@/lib/links';

const links = [
  { href: '#features', label: 'Features' },
  { href: '#preview', label: 'Preview' },
  { href: '#download', label: 'Download' },
  { href: '#faq', label: 'Questions' },
];

export function Nav() {
  return (
    <nav className="sticky top-0 z-30 bg-paper/85 backdrop-blur border-b border-rule-soft">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center gap-6">
        <a href="/" className="flex items-center gap-2.5">
          <span className="w-[26px] h-[26px] rounded-md bg-ink text-paper grid place-items-center font-serif font-semibold italic text-[15px]">
            S
          </span>
          <span className="font-serif text-[17px] font-semibold tracking-tight">Side</span>
        </a>
        <div className="hidden md:flex items-center gap-6 ml-2">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13.5px] text-ink-3 hover:text-ink transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={REPO_URL}
            className="hidden md:inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="m7 17 10-10M9 7h8v8" />
            </svg>
          </a>
          <a
            href={LATEST_RELEASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md bg-ink text-paper text-[13px] font-medium hover:bg-ink-2 transition-colors"
          >
            Get Side
          </a>
        </div>
      </div>
    </nav>
  );
}
