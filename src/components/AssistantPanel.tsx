import { useEffect, useMemo, useState } from 'react';
import {
  Settings,
  PenLine,
  SpellCheck,
  AlignLeft,
  Minimize2,
  X,
  Bot,
  AlertCircle,
  Square,
} from 'lucide-react';
import { useAI, ACTION_LABELS, type ActionKind } from '@/stores/ai';
import { useEditorRef } from '@/stores/editorRef';
import { useUi } from '@/stores/ui';
import { cn } from '@/lib/utils';
import { toast } from './Toast';
import type { Editor } from '@tiptap/core';

interface Selection {
  text: string;
  from: number;
  to: number;
}

function getSelection(editor: Editor | null): Selection | null {
  if (!editor) return null;
  const { from, to, empty } = editor.state.selection;
  if (empty) return null;
  const text = editor.state.doc.textBetween(from, to, '\n', ' ');
  if (!text.trim()) return null;
  return { text, from, to };
}

function getWholeDoc(editor: Editor | null): string {
  if (!editor) return '';
  // tiptap-markdown attaches storage.markdown when registered; fall back to plain text.
  const md = (editor.storage as { markdown?: { getMarkdown?: () => string } }).markdown;
  if (md?.getMarkdown) {
    try {
      return md.getMarkdown();
    } catch {
      /* fall through */
    }
  }
  return editor.state.doc.textContent;
}

const ACTION_ICONS: Record<ActionKind, React.ReactNode> = {
  improve: <PenLine size={13} />,
  grammar: <SpellCheck size={13} />,
  summarize: <AlignLeft size={13} />,
  shorten: <Minimize2 size={13} />,
};

const ACTION_ORDER: ActionKind[] = ['improve', 'grammar', 'summarize', 'shorten'];

export function AssistantPanel() {
  const editor = useEditorRef((s) => s.editor);
  const settings = useAI((s) => s.settings);
  const loadSettings = useAI((s) => s.loadSettings);
  const busy = useAI((s) => s.busy);
  const currentAction = useAI((s) => s.currentAction);
  const output = useAI((s) => s.output);
  const lastError = useAI((s) => s.lastError);
  const run = useAI((s) => s.run);
  const cancel = useAI((s) => s.cancel);
  const clearOutput = useAI((s) => s.clearOutput);

  const setAiSettingsOpen = useUi((s) => s.setAiSettingsOpen);

  // Re-render when selection changes so the "Selection · 142 chars" indicator updates.
  const [, force] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const tick = () => force((n) => n + 1);
    editor.on('selectionUpdate', tick);
    editor.on('transaction', tick);
    return () => {
      editor.off('selectionUpdate', tick);
      editor.off('transaction', tick);
    };
  }, [editor]);

  useEffect(() => {
    if (!settings) loadSettings();
  }, [settings, loadSettings]);

  const selection = useMemo(() => getSelection(editor), [editor]);
  const hasSelection = !!selection;

  // Capture the snapshot of selection/doc at action-time so streaming output stays
  // anchored to where the user was when they clicked, even if they navigate or
  // re-select while it's generating.
  const [target, setTarget] = useState<
    | { kind: 'selection'; from: number; to: number; original: string }
    | { kind: 'whole'; original: string }
    | null
  >(null);

  const configReady = useMemo(() => {
    if (!settings) return false;
    if (settings.provider === 'ollama') return !!settings.ollama.model;
    if (settings.provider === 'openai') return !!settings.openai.hasKey && !!settings.openai.model;
    if (settings.provider === 'anthropic')
      return !!settings.anthropic.hasKey && !!settings.anthropic.model;
    if (settings.provider === 'bedrock')
      return !!settings.bedrock.hasCreds && !!settings.bedrock.model;
    return false;
  }, [settings]);

  const onAction = (kind: ActionKind) => {
    if (!configReady) {
      setAiSettingsOpen(true);
      return;
    }
    const sel = getSelection(editor);
    if (sel) {
      setTarget({ kind: 'selection', from: sel.from, to: sel.to, original: sel.text });
      run(kind, sel.text);
    } else {
      const whole = getWholeDoc(editor);
      setTarget({ kind: 'whole', original: whole });
      run(kind, whole);
    }
  };

  const onReplace = () => {
    if (!editor || !output.trim() || !target) return;
    if (target.kind === 'selection') {
      editor
        .chain()
        .focus()
        .deleteRange({ from: target.from, to: target.to })
        .insertContent(output)
        .run();
    } else {
      editor.commands.setContent(output);
    }
    clearOutput();
    setTarget(null);
    toast.success('Replaced.');
  };

  const onInsertBelow = () => {
    if (!editor || !output.trim()) return;
    editor.chain().focus('end').insertContent('\n\n' + output).run();
    clearOutput();
    setTarget(null);
    toast.success('Inserted.');
  };

  const onDiscard = () => {
    clearOutput();
    setTarget(null);
  };

  const providerLabel =
    settings?.provider === 'ollama'
      ? `Ollama · ${settings.ollama.model || 'no model'}`
      : settings?.provider === 'openai'
      ? `OpenAI · ${settings.openai.model}`
      : settings?.provider === 'anthropic'
      ? `Anthropic · ${settings.anthropic.model}`
      : settings?.provider === 'bedrock'
      ? `Bedrock · ${settings.bedrock.model.replace(/^.*\./, '')}`
      : '—';

  const sourceLength = hasSelection ? selection!.text.length : getWholeDoc(editor).length;
  const sourceLabel = hasSelection ? 'Selection' : 'Whole note';

  return (
    <>
      <div className="px-4 pt-4 pb-3 border-b border-border-subtle flex items-center justify-between gap-2">
        <div className="font-serif text-[14px] font-semibold text-text flex items-center gap-1.5">
          <Bot size={13} className="text-text-muted" /> Assistant
        </div>
        <button
          onClick={() => setAiSettingsOpen(true)}
          title="AI settings"
          className="p-1 rounded-md text-text-muted hover:text-text hover:bg-bg-hover transition-colors shrink-0"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Status: a glanceable "is this working + what model" row. */}
      <button
        onClick={() => setAiSettingsOpen(true)}
        className="w-full px-4 py-2.5 border-b border-border-subtle flex items-center gap-2 text-left hover:bg-bg-hover transition-colors"
        title="Open AI settings"
      >
        <span
          className={cn(
            'h-2 w-2 rounded-full shrink-0',
            configReady ? 'bg-emerald-500' : 'bg-amber-500'
          )}
        />
        <span className="text-[12px] text-text-muted truncate flex-1">
          {configReady ? providerLabel : settings ? 'Not set up' : 'Loading…'}
        </span>
        <Settings size={12} className="text-text-subtle shrink-0" />
      </button>

      {!configReady && settings ? (
        // Unconfigured: one clear call to action instead of dead, disabled buttons.
        <div className="px-4 py-6 flex flex-col items-center text-center gap-3">
          <Bot size={22} className="text-text-subtle" />
          <div>
            <p className="text-[13px] text-text font-medium">Set up an AI model</p>
            <p className="mt-1 text-[12px] text-text-muted leading-snug">
              Connect a local (Ollama) or cloud model to rewrite, fix grammar, and summarize your
              notes.
            </p>
          </div>
          <button
            onClick={() => setAiSettingsOpen(true)}
            className="px-4 py-1.5 bg-accent text-bg rounded-md text-[12.5px] font-medium hover:bg-accent-hover transition-colors"
          >
            Set up AI
          </button>
        </div>
      ) : (
        <>
          <div className="px-4 py-3 border-b border-border-subtle">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-text-subtle">
              Works on
            </div>
            <div className="mt-1 text-[12.5px] text-text flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-block h-1.5 w-1.5 rounded-full',
                  hasSelection ? 'bg-accent' : 'bg-text-subtle'
                )}
              />
              {sourceLabel} · {sourceLength.toLocaleString()} chars
            </div>
            {!hasSelection && (
              <div className="mt-1 text-[11.5px] text-text-subtle italic">
                Tip: highlight text first to target just that selection.
              </div>
            )}
          </div>

          <div className="px-3 py-3 border-b border-border-subtle">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-text-subtle px-1 mb-1.5">
              Actions
            </div>
            <div className="flex flex-col gap-1">
              {ACTION_ORDER.map((kind) => {
                const isCurrent = busy && currentAction === kind;
                return (
                  <button
                    key={kind}
                    onClick={() => onAction(kind)}
                    disabled={busy}
                    className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left text-[12.5px] text-text-muted hover:bg-bg-hover hover:text-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="text-text-subtle group-hover:text-text-muted">
                      {ACTION_ICONS[kind]}
                    </span>
                    <span className="flex-1">{ACTION_LABELS[kind]}</span>
                    {isCurrent && (
                      <span className="text-[10.5px] font-mono text-text-muted uppercase tracking-wider">
                        running…
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {(output || busy || lastError) && (
        <div className="px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-2">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-text-subtle">
              {currentAction ? ACTION_LABELS[currentAction] : 'Output'}
            </div>
            {busy ? (
              <button
                onClick={cancel}
                title="Stop"
                className="text-[10.5px] font-mono uppercase tracking-wider text-text-subtle hover:text-text inline-flex items-center gap-1"
              >
                <Square size={9} className="fill-current" /> Stop
              </button>
            ) : (
              <button
                onClick={onDiscard}
                title="Clear"
                className="text-text-subtle hover:text-text transition-colors p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {lastError ? (
            <div className="text-[12px] text-red-500 flex items-start gap-1.5 leading-snug">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <span className="break-words whitespace-pre-wrap">{lastError}</span>
            </div>
          ) : (
            <div className="font-serif text-[12.5px] text-text leading-[1.55] whitespace-pre-wrap break-words max-h-[40vh] overflow-y-auto bg-bg rounded-md border border-border px-2.5 py-2">
              {output || (
                <span className="text-text-subtle italic">Waiting for model…</span>
              )}
            </div>
          )}

          {!busy && output.trim() && !lastError && (
            <div className="flex items-center gap-1.5 mt-2.5">
              <button
                onClick={onReplace}
                className="flex-1 px-2.5 py-1.5 bg-accent text-bg rounded-md text-[12px] font-medium hover:bg-accent-hover transition-colors"
              >
                Replace
              </button>
              <button
                onClick={onInsertBelow}
                className="px-2.5 py-1.5 border border-border rounded-md text-[12px] text-text-muted hover:bg-bg-hover hover:text-text transition-colors"
              >
                Insert below
              </button>
            </div>
          )}
        </div>
      )}

    </>
  );
}
