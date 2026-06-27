import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GitBranch, GitCommit, RefreshCw, ArrowUp, ArrowDown, Plus, Minus,
  RotateCcw, AlertCircle, Check, ChevronDown, ChevronRight, X, Clock,
  Cloud, CloudOff,
} from 'lucide-react';
import { useGit } from '@/stores/git';
import { useVault } from '@/stores/vault';
import { confirmUser } from './ConfirmDialog';
import { toast } from './Toast';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { GitFileEntry } from '@/types';

function isStaged(f: GitFileEntry): boolean { return f.index !== ' ' && f.index !== '?'; }
function isWorking(f: GitFileEntry): boolean { return f.working !== ' ' || f.index === '?'; }
function statusLetter(f: GitFileEntry, staged: boolean): string { const c = staged ? f.index : f.working; return c === '?' ? 'U' : c.trim() || 'M'; }

function statusBg(letter: string): string {
  switch (letter) {
    case 'A': return 'bg-emerald-500/15 text-emerald-500';
    case 'M': return 'bg-amber-500/15 text-amber-500';
    case 'D': return 'bg-red-500/15 text-red-400';
    case 'R': return 'bg-purple-500/15 text-purple-400';
    default: return 'bg-text-subtle/10 text-text-subtle';
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
  const [diffFile, setDiffFile] = useState<{ path: string; staged: boolean } | null>(null);
  const [diffContent, setDiffContent] = useState<string>('');
  const [diffLoading, setDiffLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLog, setHistoryLog] = useState<{ hash: string; message: string; date: string; author: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => { refresh(); }, [vaultPath, refresh]);

  const { staged: stagedFiles, working: workingFiles } = useMemo(() => {
    const s: GitFileEntry[] = [], w: GitFileEntry[] = [];
    for (const f of files) { if (isStaged(f)) s.push(f); if (isWorking(f)) w.push(f); }
    s.sort((a, b) => a.path.localeCompare(b.path));
    w.sort((a, b) => a.path.localeCompare(b.path));
    return { staged: s, working: w };
  }, [files]);

  const loadDiff = useCallback(async (path: string, staged: boolean) => {
    if (!vaultPath) return;
    if (diffFile?.path === path && diffFile?.staged === staged) { setDiffFile(null); return; }
    setDiffFile({ path, staged });
    setDiffLoading(true);
    const res = await api.git.diff(vaultPath, path, staged);
    setDiffLoading(false);
    if (res.ok) setDiffContent(res.diff);
    else setDiffContent(`Error: ${res.error}`);
  }, [vaultPath, diffFile]);

  const loadHistory = useCallback(async () => {
    if (!vaultPath) return;
    if (showHistory) { setShowHistory(false); return; }
    setShowHistory(true);
    setHistoryLoading(true);
    const res = await api.git.log(vaultPath, 30);
    setHistoryLoading(false);
    if (res.ok) setHistoryLog(res.log);
  }, [vaultPath, showHistory]);

  const onCommit = async () => {
    if (!message.trim()) return;
    if (!stagedFiles.length) {
      if (!workingFiles.length) { toast.error('Nothing to commit.'); return; }
      await stage(workingFiles.map((f) => f.path));
    }
    const ok = await commit(message);
    if (ok) { setMessage(''); toast.success('Committed.'); }
  };

  const onPush = async () => {
    if (!hasRemote) { toast.error('No remote configured.'); return; }
    const ok = await push();
    if (ok) toast.success('Pushed.');
    else toast.error(useGit.getState().lastError ?? 'Push failed.');
  };

  const onPull = async () => {
    if (!hasRemote) { toast.error('No remote configured.'); return; }
    const ok = await pull();
    if (ok) toast.success('Pulled.');
    else toast.error(useGit.getState().lastError ?? 'Pull failed.');
  };

  const onFetch = async () => {
    await fetchRemote();
    if (!useGit.getState().lastError) toast.success('Fetched.');
  };

  const onDiscard = async (f: GitFileEntry) => {
    const ok = await confirmUser({ title: 'Discard changes?', message: `Throw away changes to ${f.path}? This cannot be undone.`, okLabel: 'Discard', destructive: true });
    if (ok) await discard([f.path]);
  };

  if (!vaultPath) return null;

  if (loaded && !hasRepo) {
    return (
      <div className="h-full flex items-center justify-center bg-bg">
        <div className="max-w-sm text-center px-8">
          <div className="w-14 h-14 rounded-2xl bg-bg-elevated border border-border flex items-center justify-center mx-auto mb-4">
            <GitBranch size={24} className="text-text-subtle" />
          </div>
          <h2 className="text-[20px] font-semibold mb-2 text-text tracking-tight">No repository</h2>
          <p className="text-[13px] text-text-muted mb-5 leading-relaxed">Initialize a git repository to start tracking changes and syncing with a remote.</p>
          <button onClick={() => initRepo()} disabled={busy} className="px-5 py-2.5 bg-accent text-bg rounded-lg text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors">
            {busy ? 'Initializing...' : 'Initialize repository'}
          </button>
        </div>
      </div>
    );
  }

  const commitCount = stagedFiles.length || workingFiles.length;
  const canCommit = !busy && !!message.trim() && commitCount > 0;
  const synced = hasRemote && ahead === 0 && behind === 0;

  return (
    <div className="h-full flex flex-col bg-bg overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[20px] font-semibold text-text tracking-tight">Source Control</h1>
          <div className="flex items-center gap-1">
            <button onClick={loadHistory} className={cn('p-2 rounded-lg transition-colors', showHistory ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text hover:bg-bg-hover')} title="Commit history">
              <Clock size={15} />
            </button>
            <button onClick={() => refresh()} disabled={busy} className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-bg-hover disabled:opacity-50 transition-colors" title="Refresh">
              <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Branch + Remote card */}
        <div className="rounded-xl bg-bg-elevated border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                <GitBranch size={16} className="text-accent" />
              </div>
              <div>
                <div className="font-mono text-[13px] font-semibold text-text">{branch ?? '...'}</div>
                <div className="text-[11px] text-text-muted mt-0.5">
                  {hasRemote ? (tracking ?? 'remote') : 'Local only'}
                </div>
              </div>
            </div>
            {hasRemote && (
              <div className="flex items-center gap-1.5">
                {synced ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[11px] font-medium">
                    <Cloud size={12} /> Synced
                  </div>
                ) : (
                  <>
                    {behind > 0 && (
                      <button onClick={onPull} disabled={busy} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-[11px] font-semibold hover:bg-blue-500/20 transition-colors">
                        <ArrowDown size={12} /> {behind}
                      </button>
                    )}
                    {ahead > 0 && (
                      <button onClick={onPush} disabled={busy} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/20 transition-colors">
                        <ArrowUp size={12} /> {ahead}
                      </button>
                    )}
                  </>
                )}
                <button onClick={onFetch} disabled={busy || checking} className="p-1.5 rounded-lg text-text-subtle hover:text-text hover:bg-bg-hover text-[11px] transition-colors" title="Fetch remote">
                  <RefreshCw size={12} className={checking ? 'animate-spin' : ''} />
                </button>
              </div>
            )}
            {!hasRemote && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-hover text-text-subtle text-[11px]">
                <CloudOff size={12} /> No remote
              </div>
            )}
          </div>
        </div>
      </div>

      {lastError && (
        <div className="mx-6 mb-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[12px] text-red-400 flex items-start gap-2">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /><span className="break-words">{lastError}</span>
        </div>
      )}

      {/* Commit section */}
      {commitCount > 0 && (
        <div className="shrink-0 px-6 pb-4">
          <div className="rounded-xl bg-bg-elevated border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <GitCommit size={14} className="text-accent" />
              <span className="text-[12px] font-semibold text-text">Commit</span>
              <span className="text-[11px] text-text-muted">{stagedFiles.length ? `${stagedFiles.length} staged` : `${workingFiles.length} will be staged`}</span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); onCommit(); } }}
              placeholder="Describe your changes..."
              rows={2}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-[12.5px] text-text placeholder:text-text-subtle resize-none focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10.5px] text-text-subtle">Cmd+Enter to commit</span>
              <button onClick={onCommit} disabled={!canCommit} className="px-4 py-2 bg-accent text-bg rounded-lg text-[12px] font-semibold hover:bg-accent-hover disabled:opacity-35 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
                <Check size={13} strokeWidth={2.5} />
                {stagedFiles.length ? 'Commit' : 'Commit all'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* History */}
        {showHistory && (
          <div className="mb-4 rounded-xl bg-bg-elevated border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Recent commits</span>
              <button onClick={() => setShowHistory(false)} className="p-0.5 rounded text-text-muted hover:text-text"><X size={12} /></button>
            </div>
            <div className="max-h-[260px] overflow-y-auto">
              {historyLoading ? (
                <div className="px-4 py-4 text-[12px] text-text-subtle">Loading...</div>
              ) : historyLog.length === 0 ? (
                <div className="px-4 py-4 text-[12px] text-text-subtle">No commits yet.</div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {historyLog.map((c) => (
                    <div key={c.hash} className="px-4 py-3 hover:bg-bg-hover/50 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">{c.hash}</span>
                        <span className="text-[10.5px] text-text-subtle">{formatDate(c.date)}</span>
                      </div>
                      <div className="text-[12px] text-text leading-snug">{c.message}</div>
                      <div className="text-[10.5px] text-text-subtle mt-0.5">{c.author}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* File changes */}
        {stagedFiles.length === 0 && workingFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
              <Check size={22} className="text-emerald-500" strokeWidth={2.5} />
            </div>
            <p className="text-[14px] font-semibold text-text">Working tree clean</p>
            <p className="text-[12px] text-text-muted mt-1">No uncommitted changes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stagedFiles.length > 0 && (
              <FileSection
                title="Staged" count={stagedFiles.length} files={stagedFiles} staged
                action={() => unstage(stagedFiles.map((f) => f.path))} actionLabel="Unstage all"
                onFileAction={(f) => unstage([f.path])} fileActionIcon={<Minus size={12} />} fileActionTitle="Unstage"
                onDiff={loadDiff} activeDiff={diffFile}
              />
            )}
            {workingFiles.length > 0 && (
              <FileSection
                title="Changes" count={workingFiles.length} files={workingFiles} staged={false}
                action={() => stage(workingFiles.map((f) => f.path))} actionLabel="Stage all"
                onFileAction={(f) => stage([f.path])} fileActionIcon={<Plus size={12} />} fileActionTitle="Stage"
                onSecondary={onDiscard} secondaryIcon={<RotateCcw size={12} />} secondaryTitle="Discard"
                onDiff={loadDiff} activeDiff={diffFile}
              />
            )}
          </div>
        )}

        {/* Diff viewer */}
        {diffFile && (
          <div className="mt-4 rounded-xl bg-bg-elevated border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-hover/30">
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', diffFile.staged ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500')}>
                  {diffFile.staged ? 'STAGED' : 'WORKING'}
                </span>
                <span className="text-[11.5px] font-mono text-text truncate">{diffFile.path}</span>
              </div>
              <button onClick={() => setDiffFile(null)} className="p-1 rounded text-text-muted hover:text-text hover:bg-bg-hover"><X size={13} /></button>
            </div>
            <div className="max-h-[350px] overflow-auto">
              {diffLoading ? (
                <div className="px-4 py-6 text-[12px] text-text-subtle text-center">Loading diff...</div>
              ) : (
                <pre className="text-[11px] font-mono leading-[1.7] py-2">
                  {diffContent.split('\n').map((line, i) => (
                    <div key={i} className={cn(
                      'px-4 min-h-[1.7em]',
                      line.startsWith('+') && !line.startsWith('+++') && 'bg-emerald-500/8 text-emerald-400 border-l-2 border-emerald-500/40',
                      line.startsWith('-') && !line.startsWith('---') && 'bg-red-500/8 text-red-400 border-l-2 border-red-500/40',
                      line.startsWith('@@') && 'text-blue-400 bg-blue-500/5 border-l-2 border-blue-500/30 font-semibold',
                      line.startsWith('diff') && 'text-text-muted font-semibold border-l-2 border-transparent',
                      !line.startsWith('+') && !line.startsWith('-') && !line.startsWith('@@') && !line.startsWith('diff') && 'text-text-muted border-l-2 border-transparent',
                    )}>
                      {line || ' '}
                    </div>
                  ))}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── File section ────────────────────────────────────────────────────────────

function FileSection({ title, count, files, staged, action, actionLabel, onFileAction, fileActionIcon, fileActionTitle, onSecondary, secondaryIcon, secondaryTitle, onDiff, activeDiff }: {
  title: string; count: number; files: GitFileEntry[]; staged: boolean;
  action: () => void; actionLabel: string;
  onFileAction: (f: GitFileEntry) => void; fileActionIcon: React.ReactNode; fileActionTitle: string;
  onSecondary?: (f: GitFileEntry) => void; secondaryIcon?: React.ReactNode; secondaryTitle?: string;
  onDiff: (path: string, staged: boolean) => void; activeDiff: { path: string; staged: boolean } | null;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="rounded-xl bg-bg-elevated border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
        <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-wider text-text-muted hover:text-text transition-colors">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {title}
          <span className="font-mono text-[11px] font-bold bg-bg-hover px-1.5 py-0.5 rounded-md">{count}</span>
        </button>
        <button onClick={action} className="text-[11px] text-text-subtle hover:text-accent font-medium transition-colors">{actionLabel}</button>
      </div>
      {expanded && (
        <div className="divide-y divide-border-subtle">
          {files.map((f) => {
            const letter = statusLetter(f, staged);
            const isActive = activeDiff?.path === f.path && activeDiff?.staged === staged;
            return (
              <div key={f.path} className={cn('group flex items-center gap-2.5 px-4 py-2.5 transition-colors cursor-pointer', isActive ? 'bg-accent/5' : 'hover:bg-bg-hover/50')} onClick={() => onDiff(f.path, staged)}>
                <span className={cn('font-mono text-[10px] font-bold w-5 h-5 rounded-md flex items-center justify-center shrink-0', statusBg(letter))}>{letter}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] text-text truncate">{f.path.split('/').pop()}</div>
                  {f.path.includes('/') && <div className="text-[10.5px] text-text-subtle truncate">{f.path.slice(0, f.path.lastIndexOf('/'))}</div>}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  {onSecondary && <button onClick={() => onSecondary(f)} className="p-1.5 rounded-md text-text-subtle hover:text-red-400 hover:bg-red-500/10 transition-colors" title={secondaryTitle}>{secondaryIcon}</button>}
                  <button onClick={() => onFileAction(f)} className="p-1.5 rounded-md text-text-subtle hover:text-accent hover:bg-accent/10 transition-colors" title={fileActionTitle}>{fileActionIcon}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return iso; }
}
