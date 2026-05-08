import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react';
import { useOnboarding } from '@/stores/onboarding';
import { useVault } from '@/stores/vault';
import { cn } from '@/lib/utils';

interface Step {
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  visual: React.ReactNode;
}

export function Onboarding() {
  const open = useOnboarding((s) => s.open);
  const finish = useOnboarding((s) => s.finish);
  const skip = useOnboarding((s) => s.skip);
  const pickVault = useVault((s) => s.pickVault);
  const vaultPath = useVault((s) => s.vaultPath);

  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, STEPS.length - 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, skip]);

  if (!open) return null;

  const STEPS: Step[] = [
    {
      eyebrow: 'one',
      title: 'A quiet place for thinking.',
      body: (
        <>
          Your notes live as plain markdown files on your Mac. Always yours,
          always portable, always readable. Nothing lives in someone else's
          cloud.
        </>
      ),
      visual: <BrandVisual />,
    },
    {
      eyebrow: 'two',
      title: 'Connect ideas with brackets.',
      body: (
        <>
          Type <Kbd>[[</Kbd> and start a note name. Pick from the list or create
          a new one. Every link you make appears in the{' '}
          <span className="text-text">Connections</span> graph.
        </>
      ),
      visual: <LinkVisual />,
    },
    {
      eyebrow: 'three',
      title: 'Slash for blocks. At for mentions.',
      body: (
        <>
          Press <Kbd>/</Kbd> to insert headings, lists, code blocks, tables.
          Press <Kbd>@</Kbd> to mention a note, a <span className="text-tag font-mono">#tag</span>, or a date
          like <span className="font-mono text-text">@today</span>.
        </>
      ),
      visual: <SlashVisual />,
    },
    {
      eyebrow: 'four',
      title: 'Pick a folder. Start writing.',
      body: vaultPath ? (
        <>
          You're set up. Press <Kbd>⌘</Kbd>+<Kbd>K</Kbd> to search, or{' '}
          <Kbd>⌘</Kbd>+<Kbd>/</Kbd> any time to see all the shortcuts.
        </>
      ) : (
        <>
          Choose any folder on your computer. That's your vault. You can change
          it later from the sidebar.
        </>
      ),
      visual: <VaultVisual hasVault={!!vaultPath} />,
    },
  ];

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-text/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl rounded-[14px] border border-border bg-bg shadow-2xl overflow-hidden animate-fade-in"
      >
        {/* Skip pill */}
        <button
          onClick={skip}
          className="absolute top-4 right-5 z-10 font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-subtle hover:text-text transition-colors"
        >
          Skip tour
        </button>

        {/* Visual area */}
        <div className="h-56 bg-bg-elevated border-b border-border-subtle flex items-center justify-center px-12">
          {current.visual}
        </div>

        {/* Body */}
        <div className="px-12 pt-9 pb-7">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-accent-ink mb-3">
            {current.eyebrow} of {STEPS.length}
          </div>
          <h2 className="font-serif text-[30px] font-semibold tracking-tight leading-[1.15] text-text mb-4">
            {current.title}
          </h2>
          <p className="font-serif text-[16px] leading-relaxed text-text-muted max-w-lg">
            {current.body}
          </p>
        </div>

        {/* Footer */}
        <div className="px-12 pb-8 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-8 bg-accent' : 'w-1.5 bg-border'
                )}
              />
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => Math.max(s - 1, 0))}
                className="flex items-center gap-1 px-3 h-9 rounded-md text-[13px] text-text-muted hover:text-text hover:bg-bg-elevated transition-colors"
              >
                <ChevronLeft size={14} />
                Back
              </button>
            )}
            {!isLast ? (
              <button
                onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
                className="flex items-center gap-1.5 px-4 h-9 rounded-md text-[13px] bg-accent text-bg font-medium hover:bg-accent-hover transition-colors"
              >
                Next
                <ChevronRight size={14} />
              </button>
            ) : !vaultPath ? (
              <button
                onClick={async () => {
                  await pickVault();
                  finish();
                }}
                className="flex items-center gap-1.5 px-4 h-9 rounded-md text-[13px] bg-accent text-bg font-medium hover:bg-accent-hover transition-colors"
              >
                <FolderOpen size={14} />
                Pick a vault
              </button>
            ) : (
              <button
                onClick={finish}
                className="flex items-center gap-1.5 px-4 h-9 rounded-md text-[13px] bg-accent text-bg font-medium hover:bg-accent-hover transition-colors"
              >
                Start writing
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-[1px] rounded border border-border bg-bg-elevated font-mono text-[11px] text-text mx-[1px]">
      {children}
    </kbd>
  );
}

// ----- Visuals -----

function BrandVisual() {
  return (
    <div className="flex items-center gap-5">
      <div className="w-16 h-16 rounded-xl bg-text text-bg grid place-items-center font-serif font-semibold italic text-[40px]">
        S
      </div>
      <div className="font-serif">
        <div className="text-[36px] font-semibold tracking-tight leading-none text-text">
          SideNotes.
        </div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-muted mt-2">
          A second brain · v0.1
        </div>
      </div>
    </div>
  );
}

function LinkVisual() {
  return (
    <div className="font-serif text-[16px] leading-relaxed text-text max-w-md">
      The slow query is sequential scan on a billion-row table —{' '}
      <span className="text-accent-ink bg-accent-subtle px-1 rounded border-b border-accent">
        [[Database indexing]]
      </span>{' '}
      would have caught it in review.
    </div>
  );
}

function SlashVisual() {
  return (
    <div className="flex items-center gap-3 font-mono text-[12.5px] text-text-muted">
      <Tag>/heading</Tag>
      <Tag>/code</Tag>
      <Tag>/table</Tag>
      <span className="text-text-subtle">·</span>
      <Tag accent>@today</Tag>
      <Tag accent>@Atomic Habits</Tag>
    </div>
  );
}

function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-md border',
        accent
          ? 'bg-accent-subtle border-accent text-accent-ink'
          : 'bg-bg border-border text-text'
      )}
    >
      {children}
    </span>
  );
}

function VaultVisual({ hasVault }: { hasVault: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-tag-soft text-tag font-mono text-[11px] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-tag" />
        {hasVault ? 'Vault connected' : 'Saved on your Mac'}
      </div>
      <div className="font-serif text-[14px] text-text-muted">
        {hasVault ? 'You’re all set.' : 'No account, no sync, no lock-in.'}
      </div>
    </div>
  );
}
