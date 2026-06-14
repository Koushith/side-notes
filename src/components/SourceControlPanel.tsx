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
  const fetchRemote = useGit((s) => s.fetchRemote);
  const checking = useGit((s) => s.checking);
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
    if (ok) toast.success(behind > 0 ? `Pulled ${behind} change${behind === 1 ? '' : 's'}.` : 'Already up to date.');
    else toast.error(useGit.getState().lastError ?? 'Pull failed.');
  };

  const onCheckForUpdates = async () => {
    if (!hasRemote) return;
    const before = useGit.getState().behind;
    await fetchRemote();
    const after = useGit.getState().behind;
    if (useGit.getState().lastError) return;
    if (after > before) toast.success(`${after - before} new change${after - before === 1 ? '' : 's'} on GitHub. Pull to bring them in.`);
    else toast.success('Up to date with GitHub.');
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

  const busyOrChecking = busy || checking;

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Header: branch identity */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch size={15} className="text-text-muted shrink-0" />
          <span className="font-mono text-[13px] text-text truncate">{branch ?? '—'}</span>
          {tracking && (
            <span className="font-mono text-[11px] text-text-subtle truncate">→ {tracking}</span>
          )}
        </div>
        <button
          onClick={() => refresh()}
          disabled={busyOrChecking}
          className="p-1.5 rounded-md text-text-muted hover:bg-bg-hover hover:text-text transition-colors disabled:opacity-50"
          title="Refresh status"
        >
          <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Commit box — only when there's something to commit. */}
      {hasChanges && (
        <div className="px-5 pt-4 pb-4 border-b border-border-subtle space-y-2.5">
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

      {/* Sync — Pull + Push always side by side so both are one click away. */}
      <div className="px-5 pt-4 pb-4 border-b border-border-subtle space-y-3">
        {!hasRemote ? (
          hasRepo && (
            <p className="text-[11.5px] text-text-subtle leading-snug">
              No remote yet. Add one in Terminal (<code>git remote add origin …</code>) to sync your
              notes with GitHub.
            </p>
          )
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <SyncButton
                onClick={onPull}
                disabled={busyOrChecking}
                active={behind > 0}
                icon={<ArrowDown size={14} />}
                label="Pull"
                count={behind}
              />
              <SyncButton
                onClick={onPush}
                disabled={busyOrChecking || ahead === 0}
                active={ahead > 0}
                icon={<ArrowUp size={14} />}
                label="Push"
                count={ahead}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11.5px] min-w-0">
                {synced ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-500">
                    <Check size={12} className="shrink-0" /> Up to date with {tracking ?? 'remote'}
                  </span>
                ) : (
                  <span className="text-text-muted truncate">
                    {ahead > 0 && `${ahead} to push`}
                    {ahead > 0 && behind > 0 && ' · '}
                    {behind > 0 && `${behind} to pull`}
                  </span>
                )}
              </span>
              <button
                onClick={onCheckForUpdates}
                disabled={busyOrChecking}
                className="inline-flex items-center gap-1.5 text-[11.5px] text-text-subtle hover:text-text transition-colors disabled:opacity-50 shrink-0"
                title="Fetch the latest from GitHub"
              >
                <RefreshCw size={11} className={checking ? 'animate-spin' : ''} />
                {checking ? 'Checking…' : 'Check for updates'}
              </button>
            </div>
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
            <Check size={20} className="text-text-subtle" />
            <p className="text-[12.5px] text-text-muted">No local changes</p>
            <p className="text-[11.5px] text-text-subtle leading-snug">
              Everything is committed. Edit a note and changes show up here.
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

function SyncButton({
  onClick,
  disabled,
  active,
  icon,
  label,
  count,
}: {
  onClick: () => void;
  disabled: boolean;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-3 py-2 rounded-md text-[12.5px] font-medium transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed',
        active
          ? 'bg-accent text-bg hover:bg-accent-hover'
          : 'border border-border text-text-muted hover:bg-bg-hover hover:text-text'
      )}
    >
      {icon}
      {label}
      {count > 0 && (
        <span
          className={cn(
            'ml-0.5 px-1.5 rounded-full text-[10.5px] font-semibold tabular-nums',
            active ? 'bg-bg/25 text-bg' : 'bg-bg-hover text-text-muted'
          )}
        >
          {count}
        </span>
      )}
    </button>
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
