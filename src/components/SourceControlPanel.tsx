import { useEffect, useMemo, useState } from 'react';
import {
  GitBranch,
  GitCommit,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Plus,
  Minus,
  RotateCcw,
  FileText,
  AlertCircle,
  Check,
} from 'lucide-react';
import { useGit } from '@/stores/git';
import { useVault } from '@/stores/vault';
import { confirmUser } from './ConfirmDialog';
import { toast } from './Toast';
import { cn } from '@/lib/utils';
import type { GitFileEntry } from '@/types';

// VSCode's status grouping: a file is "staged" if its index column is set to anything
// other than a space (unmodified) or `?` (untracked). It's in "working changes" if its
// working column is non-space. The same file can appear in both — that's correct, it
// means you staged a version and then modified the file again.
function isStaged(f: GitFileEntry): boolean {
  return f.index !== ' ' && f.index !== '?';
}
function isWorking(f: GitFileEntry): boolean {
  return f.working !== ' ' || f.index === '?';
}

function statusLetter(f: GitFileEntry, staged: boolean): string {
  const code = staged ? f.index : f.working;
  if (code === '?') return 'U';
  return code.trim() || 'M';
}

function statusColor(letter: string): string {
  switch (letter) {
    case 'A': return 'text-green-500';
    case 'M': return 'text-amber-500';
    case 'D': return 'text-red-500';
    case 'R': return 'text-blue-500';
    case 'U': return 'text-text-subtle';
    default: return 'text-text-muted';
  }
}

export function SourceControlPanel() {
  const vaultPath = useVault((s) => s.vaultPath);
  const hasRepo = useGit((s) => s.hasRepo);
  const hasRemote = useGit((s) => s.hasRemote);
  const branch = useGit((s) => s.branch);
  const tracking = useGit((s) => s.tracking);
  const ahead = useGit((s) => s.ahead);
  const behind = useGit((s) => s.behind);
  const files = useGit((s) => s.files);
  const busy = useGit((s) => s.busy);
  const lastError = useGit((s) => s.lastError);
  const loaded = useGit((s) => s.loaded);
  const refresh = useGit((s) => s.refresh);
  const initRepo = useGit((s) => s.initRepo);
  const stage = useGit((s) => s.stage);
  const unstage = useGit((s) => s.unstage);
  const discard = useGit((s) => s.discard);
  const commit = useGit((s) => s.commit);
  const push = useGit((s) => s.push);
  const pull = useGit((s) => s.pull);

  const [message, setMessage] = useState('');

  useEffect(() => {
    refresh();
  }, [vaultPath, refresh]);

  const { staged, working } = useMemo(() => {
    const staged: GitFileEntry[] = [];
    const working: GitFileEntry[] = [];
    for (const f of files) {
      if (isStaged(f)) staged.push(f);
      if (isWorking(f)) working.push(f);
    }
    staged.sort((a, b) => a.path.localeCompare(b.path));
    working.sort((a, b) => a.path.localeCompare(b.path));
    return { staged, working };
  }, [files]);

  const onCommit = async () => {
    if (!message.trim()) return;
    // Friendly model: if the user hasn't staged anything but has changes, stage
    // them all and commit — no one should have to learn "staging" to save a note.
    if (!staged.length) {
      if (!working.length) {
        toast.error('Nothing to commit.');
        return;
      }
      await stage(working.map((f) => f.path));
    }
    const ok = await commit(message);
    if (ok) {
      setMessage('');
      toast.success(hasRemote ? 'Committed. Push to send it to GitHub.' : 'Committed.');
    }
  };

  // What the commit button does, given current state.
  const commitCount = staged.length || working.length;
  const commitLabel = staged.length ? 'Commit' : 'Commit all';
  const canCommit = !busy && !!message.trim() && commitCount > 0;
  const hasChanges = staged.length > 0 || working.length > 0;
  const synced = hasRemote && ahead === 0 && behind === 0;

  const onPush = async () => {
    if (!hasRemote) {
      toast.error('No remote configured — add one in Terminal first.');
      return;
    }
    const ok = await push();
    if (ok) toast.success('Pushed to GitHub.');
    else toast.error(useGit.getState().lastError ?? 'Push failed.');
  };

  const onPull = async () => {
    if (!hasRemote) {
      toast.error('No remote configured.');
      return;
    }
    const ok = await pull();
    if (ok) toast.success('Up to date.');
    else toast.error(useGit.getState().lastError ?? 'Pull failed.');
  };

  const onDiscard = async (f: GitFileEntry) => {
    const ok = await confirmUser({
      title: 'Discard changes?',
      message: `Throw away changes to ${f.path}? This cannot be undone.`,
      okLabel: 'Discard',
      destructive: true,
    });
    if (!ok) return;
    await discard([f.path]);
  };

  if (!vaultPath) return null;

  if (loaded && !hasRepo) {
    return (
      <div className="h-full flex items-center justify-center bg-bg">
        <div className="max-w-md text-center px-6">
          <GitBranch size={28} className="mx-auto mb-3 text-text-subtle" />
          <h2 className="font-serif text-[22px] font-semibold mb-2 text-text">No git repository</h2>
          <p className="text-[13px] text-text-muted mb-5 leading-relaxed">
            This vault isn't tracked by git yet. Initialize a repository to track changes,
            commit your notes, and sync with a remote.
          </p>
          <button
            onClick={() => initRepo()}
            disabled={busy}
            className="px-4 py-2 bg-accent text-bg rounded-md text-[12.5px] font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {busy ? 'Initializing…' : 'Initialize repository'}
          </button>
          {lastError && (
            <p className="mt-4 text-[12px] text-red-500 flex items-center justify-center gap-1.5">
              <AlertCircle size={12} /> {lastError}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Header: branch + honest sync state */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch size={15} className="text-text-muted shrink-0" />
          <span className="font-mono text-[12.5px] text-text truncate">{branch ?? '—'}</span>
          {tracking && (
            <span className="font-mono text-[11px] text-text-subtle truncate hidden sm:inline">
              → {tracking}
            </span>
          )}
          {synced && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 ml-1 shrink-0">
              <Check size={11} /> Up to date
            </span>
          )}
        </div>
        <button
          onClick={() => refresh()}
          disabled={busy}
          className="p-1.5 rounded-md text-text-muted hover:bg-bg-hover hover:text-text transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Commit box — only when there's something to commit. */}
      {hasChanges && (
        <div className="px-5 pt-4 pb-3 border-b border-border-subtle space-y-2.5">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                onCommit();
              }
            }}
            placeholder="Message — what changed? (Cmd+Enter to commit)"
            rows={2}
            className="w-full px-2.5 py-2 bg-bg-elevated border border-border rounded-md text-[12.5px] text-text placeholder:text-text-subtle resize-none focus:outline-none focus:border-accent/40"
          />
          <button
            onClick={onCommit}
            disabled={!canCommit}
            className="w-full px-3 py-2 bg-accent text-bg rounded-md text-[12.5px] font-medium hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <GitCommit size={13} /> {commitLabel} {commitCount} change{commitCount === 1 ? '' : 's'}
          </button>
        </div>
      )}

      {/* Sync — adaptive: surfaces the next action (push / pull) prominently. */}
      <div className="px-5 pt-3 pb-3 border-b border-border-subtle space-y-2">
        {!hasRemote ? (
          hasRepo && (
            <p className="text-[11.5px] text-text-subtle leading-snug">
              No remote yet. Add one in Terminal (<code>git remote add origin …</code>) to push your
              notes to GitHub.
            </p>
          )
        ) : (
          <>
            {ahead > 0 && (
              <button
                onClick={onPush}
                disabled={busy}
                className="w-full px-3 py-2 bg-accent text-bg rounded-md text-[12.5px] font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5"
                title={`Push to ${tracking ?? 'remote'}`}
              >
                <ArrowUp size={13} /> Push {ahead} commit{ahead === 1 ? '' : 's'} to GitHub
              </button>
            )}
            {behind > 0 && (
              <button
                onClick={onPull}
                disabled={busy}
                className={cn(
                  'w-full px-3 py-2 rounded-md text-[12.5px] font-medium transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-50',
                  ahead > 0
                    ? 'border border-border text-text-muted hover:bg-bg-hover hover:text-text'
                    : 'bg-accent text-bg hover:bg-accent-hover'
                )}
              >
                <ArrowDown size={13} /> Pull {behind} change{behind === 1 ? '' : 's'}
              </button>
            )}
            {synced && (
              <button
                onClick={onPull}
                disabled={busy}
                className="w-full px-3 py-1.5 border border-border rounded-md text-[12px] text-text-muted hover:bg-bg-hover hover:text-text disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5"
                title="Check the remote for new changes"
              >
                <ArrowDown size={12} /> Check for updates
              </button>
            )}
          </>
        )}
        {lastError && (
          <p className="text-[11.5px] text-red-500 flex items-start gap-1.5">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            <span className="break-words">{lastError}</span>
          </p>
        )}
      </div>

      {/* File lists */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {staged.length === 0 && working.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-1.5 text-center px-6">
            <GitCommit size={20} className="text-text-subtle" />
            <p className="text-[12.5px] text-text-muted">No changes</p>
            <p className="text-[11.5px] text-text-subtle leading-snug">
              {ahead > 0 && hasRemote
                ? `${ahead} commit${ahead > 1 ? 's' : ''} ready to push.`
                : 'Everything is committed. Edit a note and changes show up here.'}
            </p>
          </div>
        )}

        {staged.length > 0 && (
          <Section
            label={`Staged (${staged.length})`}
            action={
              <button
                onClick={() => unstage(staged.map((f) => f.path))}
                disabled={busy}
                className="text-text-subtle hover:text-text transition-colors p-0.5"
                title="Unstage all"
              >
                <Minus size={12} />
              </button>
            }
          >
            {staged.map((f) => (
              <FileRow
                key={'s:' + f.path}
                file={f}
                staged
                onPrimary={() => unstage([f.path])}
                primaryIcon={<Minus size={12} />}
                primaryTitle="Unstage"
              />
            ))}
          </Section>
        )}

        {working.length > 0 && (
          <Section
            label={`Changes (${working.length})`}
            action={
              <div className="flex items-center gap-1">
                <button
                  onClick={() => stage(working.map((f) => f.path))}
                  disabled={busy}
                  className="text-text-subtle hover:text-text transition-colors p-0.5"
                  title="Stage all"
                >
                  <Plus size={12} />
                </button>
              </div>
            }
          >
            {working.map((f) => (
              <FileRow
                key={'w:' + f.path}
                file={f}
                staged={false}
                onPrimary={() => stage([f.path])}
                primaryIcon={<Plus size={12} />}
                primaryTitle="Stage"
                onSecondary={() => onDiscard(f)}
                secondaryIcon={<RotateCcw size={12} />}
                secondaryTitle="Discard"
              />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between px-2 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-text-subtle">
        <span>{label}</span>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

function FileRow({
  file,
  staged,
  onPrimary,
  primaryIcon,
  primaryTitle,
  onSecondary,
  secondaryIcon,
  secondaryTitle,
}: {
  file: GitFileEntry;
  staged: boolean;
  onPrimary: () => void;
  primaryIcon: React.ReactNode;
  primaryTitle: string;
  onSecondary?: () => void;
  secondaryIcon?: React.ReactNode;
  secondaryTitle?: string;
}) {
  const openFile = useVault((s) => s.openFile);
  const letter = statusLetter(file, staged);
  const color = statusColor(letter);
  const dir = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : '';
  const base = file.path.split('/').pop() ?? file.path;

  return (
    <div className="group flex items-center gap-2 px-2 py-1 rounded-md hover:bg-bg-hover">
      <button
        onClick={() => openFile(file.path)}
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
        title={`Open ${file.path}`}
      >
        <FileText size={12} className="text-text-subtle shrink-0" />
        <span className="text-[12.5px] text-text truncate">{base}</span>
        {dir && <span className="text-[11px] text-text-subtle truncate">{dir}</span>}
      </button>
      <span className={cn('font-mono text-[11px] w-3 text-center', color)}>{letter}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onSecondary && (
          <button
            onClick={onSecondary}
            className="p-1 rounded text-text-subtle hover:bg-bg hover:text-text"
            title={secondaryTitle}
          >
            {secondaryIcon}
          </button>
        )}
        <button
          onClick={onPrimary}
          className="p-1 rounded text-text-subtle hover:bg-bg hover:text-text"
          title={primaryTitle}
        >
          {primaryIcon}
        </button>
      </div>
    </div>
  );
}
