import { Plus, Calendar } from 'lucide-react';
import { useVault } from '@/stores/vault';
import { TipOfTheDay } from './TipOfTheDay';

export function WelcomeNote() {
  const createFile = useVault((s) => s.createFile);
  const openOrCreateDaily = useVault((s) => s.openOrCreateDaily);
  const fileCount = useVault((s) => s.files.size);

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-full flex items-center justify-center py-16 px-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-7">
            <div className="font-serif text-[28px] font-semibold tracking-tight text-text mb-2">
              {fileCount > 0 ? 'Pick a note, or start something new.' : 'An empty vault.'}
            </div>
            <div className="font-serif text-[14px] text-text-muted">
              {fileCount > 0
                ? `${fileCount} note${fileCount === 1 ? '' : 's'} in this vault.`
                : 'Create your first note below.'}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-9">
            <button
              onClick={() => createFile('Untitled')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] rounded-md bg-accent text-bg hover:bg-accent-hover font-medium"
            >
              <Plus size={13} />
              New Note
            </button>
            <button
              onClick={() => openOrCreateDaily()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] rounded-md border border-border text-text-muted hover:text-text hover:bg-bg-elevated"
            >
              <Calendar size={13} />
              Today
            </button>
          </div>

          <TipOfTheDay />
        </div>
      </div>
    </div>
  );
}
