import { X, FolderOpen, Check, FolderSymlink } from 'lucide-react';
import { useVault } from '@/stores/vault';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function VaultSwitcher({ open, onClose }: Props) {
  const vaultPath = useVault((s) => s.vaultPath);
  const recentVaults = useVault((s) => s.recentVaults);
  const openVault = useVault((s) => s.openVault);
  const pickVault = useVault((s) => s.pickVault);

  if (!open) return null;

  async function handleOpen(p: string) {
    onClose();
    await openVault(p);
  }

  async function handleBrowse() {
    onClose();
    await pickVault();
  }

  // Recents excluding the currently open vault
  const others = recentVaults.filter((p) => p !== vaultPath);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-[min(440px,92vw)] rounded-xl border border-border bg-bg-elevated shadow-2xl animate-fade-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle mb-0.5">Vaults</div>
            <h2 className="font-serif text-[18px] font-semibold text-text">Switch vault</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 grid place-items-center rounded-md text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="py-2">
          {/* Current vault */}
          {vaultPath && (
            <div className="px-3 pb-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-subtle px-2 pt-1 pb-1.5">
                Open
              </div>
              <VaultRow
                vaultPath={vaultPath}
                active
                onClick={() => onClose()}
              />
            </div>
          )}

          {/* Recent vaults */}
          {others.length > 0 && (
            <div className={cn('px-3', vaultPath && 'border-t border-border-subtle pt-2')}>
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-subtle px-2 pt-1 pb-1.5">
                Recent
              </div>
              {others.map((p) => (
                <VaultRow key={p} vaultPath={p} onClick={() => handleOpen(p)} />
              ))}
            </div>
          )}

          {/* Browse */}
          <div className={cn('px-3 pt-1', (vaultPath || others.length > 0) && 'border-t border-border-subtle mt-1')}>
            <button
              onClick={handleBrowse}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-text-muted hover:text-text hover:bg-bg-hover transition-colors mt-1 mb-1"
            >
              <span className="w-8 h-8 rounded-md border border-dashed border-border flex items-center justify-center shrink-0">
                <FolderOpen size={14} className="text-text-subtle" />
              </span>
              <div>
                <div className="font-serif font-medium text-text">Open folder…</div>
                <div className="text-[11px] text-text-subtle">Browse for a vault on your Mac</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VaultRow({
  vaultPath,
  active,
  onClick,
}: {
  vaultPath: string;
  active?: boolean;
  onClick: () => void;
}) {
  const name = vaultPath.split(/[\\/]/).pop() ?? vaultPath;
  const short = vaultPath.replace(/^\/Users\/[^/]+/, '~');

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors',
        active
          ? 'bg-accent/10 text-text cursor-default'
          : 'text-text-muted hover:text-text hover:bg-bg-hover'
      )}
    >
      <span className={cn(
        'w-8 h-8 rounded-md flex items-center justify-center shrink-0',
        active ? 'bg-accent/15' : 'bg-bg border border-border'
      )}>
        <FolderSymlink size={14} className={active ? 'text-accent-ink' : 'text-text-subtle'} />
      </span>
      <div className="flex-1 text-left min-w-0">
        <div className={cn('font-serif font-semibold truncate', active ? 'text-text' : 'text-text-muted')}>
          {name}
        </div>
        <div className="font-mono text-[10.5px] text-text-subtle truncate mt-[1px]">{short}</div>
      </div>
      {active && <Check size={13} className="text-accent-ink shrink-0" />}
    </button>
  );
}
