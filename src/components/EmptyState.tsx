import { FolderOpen, BookOpen } from 'lucide-react';
import { useVault } from '@/stores/vault';
import { useOnboarding } from '@/stores/onboarding';
import { TipOfTheDay } from './TipOfTheDay';

export function EmptyState({ onOpenVaultSwitcher }: { onOpenVaultSwitcher?: () => void }) {
  const pickVault = useVault((s) => s.pickVault);
  const startTour = useOnboarding((s) => s.start);

  return (
    <div className="h-full w-full overflow-y-auto bg-bg">
      <div className="min-h-full flex items-center justify-center py-16 px-6">
        <div className="max-w-xl w-full">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-text text-bg mb-7 font-serif font-semibold italic text-[28px]">
              S
            </div>
            <h1 className="font-serif text-[40px] font-semibold tracking-tight leading-[1.05] mb-4 text-text">
              SideNotes.
            </h1>
            <p className="font-serif text-text-muted leading-relaxed max-w-md mx-auto">
              A quiet, local-first second brain. Your notes stay as plain markdown files
              on your Mac. Link them with{' '}
              <span className="text-accent-ink bg-accent-subtle px-1.5 py-0.5 rounded border-b border-accent">
                [[brackets]]
              </span>{' '}
              and tag with{' '}
              <span className="text-tag bg-tag-soft px-1.5 py-0.5 rounded font-mono text-[12px]">
                #hashtags
              </span>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            <button
              onClick={onOpenVaultSwitcher ?? pickVault}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-accent text-bg font-medium hover:bg-accent-hover transition-colors"
            >
              <FolderOpen size={16} />
              Pick a vault folder
            </button>
            <button
              onClick={startTour}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-border text-text-muted hover:text-text hover:bg-bg-elevated transition-colors text-[13px]"
            >
              <BookOpen size={14} />
              Take the tour
            </button>
          </div>

          <TipOfTheDay />

          <div className="mt-10 flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tag-soft text-tag text-[10.5px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-tag" />
              Saved on your Mac
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
