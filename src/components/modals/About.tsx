import { useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const APP_VERSION = '0.2.0';
const PRIVACY_URL = 'https://sidenotes.me/privacy';
const SUPPORT_EMAIL = 'hello@sidenotes.me';

interface Bullet { title: string; body: string }
const BULLETS: Bullet[] = [
  {
    title: 'No telemetry, ever.',
    body: 'SideNotes never sends analytics, crash reports, or usage data anywhere. There is no account.',
  },
  {
    title: 'No cloud.',
    body: 'Every note lives as a plain .md file inside the vault folder you choose. Sync it yourself via iCloud, Dropbox, or Syncthing if you want sync.',
  },
  {
    title: 'No network calls.',
    body: 'Fonts and assets are bundled. The app does not contact any remote server during normal use.',
  },
  {
    title: 'Your data is portable.',
    body: 'Deleting SideNotes leaves your notes untouched. They’re plain markdown — open them in any editor.',
  },
];

export function About({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-text/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl max-h-[82vh] rounded-[14px] border border-border bg-bg shadow-2xl flex flex-col overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 pt-7 pb-5 border-b border-border-subtle flex items-end justify-between">
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-accent-ink mb-2">
              About · v{APP_VERSION}
            </div>
            <h2 className="font-serif text-[28px] font-semibold tracking-tight text-text leading-none">
              SideNotes.
            </h2>
            <div className="mt-2 font-serif italic text-[14px] text-text-muted">
              your second brain — quiet, local, yours.
            </div>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-subtle hover:text-text"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-8 py-6">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-muted mb-3">
            Privacy in plain words
          </div>
          <div className="flex flex-col gap-4">
            {BULLETS.map((b) => (
              <div key={b.title} className="flex flex-col gap-1">
                <div className="font-serif text-[14.5px] font-semibold text-text leading-snug">
                  {b.title}
                </div>
                <div className="font-serif text-[13.5px] text-text-muted leading-snug">
                  {b.body}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7 pt-5 border-t border-border-subtle">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-muted mb-3">
              The fine print
            </div>
            <div className="font-serif text-[13.5px] text-text-muted leading-relaxed">
              The full policy lives at{' '}
              <a
                href={PRIVACY_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="text-text hover:underline"
              >
                sidenotes.me/privacy
              </a>
              . SideNotes is open-source under the MIT licence. Questions or
              security reports → {' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-text hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </div>
          </div>
        </div>

        <div className="px-8 py-4 border-t border-border-subtle font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-subtle flex items-center justify-between">
          <span>v{APP_VERSION} · MIT licence</span>
          <span className="text-text-muted normal-case font-serif tracking-normal text-[12.5px]">
            sidenotes.me
          </span>
        </div>
      </div>
    </div>
  );
}
