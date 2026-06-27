import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Check,
  ArrowDownToLine,
  Square,
  AlertCircle,
  CornerDownLeft,
} from 'lucide-react';
import { useAI, EXTENDED_SYSTEM_PROMPTS, type ExtendedActionKind } from '@/stores/ai';
import { useUi } from '@/stores/ui';
import { cn } from '@/lib/utils';
import type { Editor } from '@tiptap/core';

interface QuickAction {
  id: ExtendedActionKind;
  label: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'improve', label: 'Improve' },
  { id: 'grammar', label: 'Fix grammar' },
  { id: 'shorten', label: 'Shorter' },
  { id: 'expand', label: 'Expand' },
  { id: 'simplify', label: 'Simplify' },
  { id: 'translate', label: 'Translate' },
];

interface InlineAIProps {
  editor: Editor;
  onClose: () => void;
}

interface CapturedTarget {
  kind: 'selection' | 'paragraph';
  from: number;
  to: number;
  text: string;
}

function getTarget(editor: Editor): CapturedTarget | null {
  const { from, to, empty } = editor.state.selection;
  if (!empty) {
    const text = editor.state.doc.textBetween(from, to, '\n', ' ');
    if (text.trim()) return { kind: 'selection', from, to, text };
  }
  // No selection: use the current paragraph/block
  const $pos = editor.state.selection.$from;
  const node = $pos.parent;
  if (!node || !node.textContent.trim()) return null;
  const start = $pos.start();
  const end = start + node.content.size;
  return { kind: 'paragraph', from: start, to: end, text: node.textContent };
}

export function InlineAI({ editor, onClose }: InlineAIProps) {
  const [input, setInput] = useState('');
  const [selectedChip, setSelectedChip] = useState(-1);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [target, setTarget] = useState<CapturedTarget | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const busy = useAI((s) => s.busy);
  const output = useAI((s) => s.output);
  const lastError = useAI((s) => s.lastError);
  const runCustom = useAI((s) => s.runCustom);
  const cancel = useAI((s) => s.cancel);
  const clearOutput = useAI((s) => s.clearOutput);
  const settings = useAI((s) => s.settings);
  const loadSettings = useAI((s) => s.loadSettings);
  const setAiSettingsOpen = useUi((s) => s.setAiSettingsOpen);

  // Compute position near the cursor/selection
  useEffect(() => {
    const captured = getTarget(editor);
    setTarget(captured);

    try {
      const { from } = editor.state.selection;
      const coords = editor.view.coordsAtPos(from);
      const editorRect = editor.view.dom.getBoundingClientRect();

      // Position below the line, clamped to viewport
      let top = coords.bottom + 8;
      let left = Math.max(coords.left - 20, editorRect.left);

      // Clamp so the bar doesn't overflow right
      const barWidth = 420;
      if (left + barWidth > window.innerWidth - 16) {
        left = window.innerWidth - barWidth - 16;
      }
      // If would overflow bottom, show above
      if (top + 200 > window.innerHeight) {
        top = coords.top - 200;
      }
      setPosition({ top, left });
    } catch {
      // Fallback: center of viewport
      setPosition({ top: window.innerHeight / 3, left: window.innerWidth / 2 - 210 });
    }
  }, [editor]);

  // Load settings on mount
  useEffect(() => {
    if (!settings) loadSettings();
  }, [settings, loadSettings]);

  // Autofocus input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Scroll output to bottom as it streams
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Clear AI output when closing
  useEffect(() => {
    return () => {
      clearOutput();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (busy) {
          cancel();
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [busy, cancel, onClose]);

  // Click outside to close (only if not busy)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (busy) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use timeout to avoid the same click that opened the bar from closing it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', onClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', onClick);
    };
  }, [busy, onClose]);

  const configReady = (() => {
    if (!settings) return false;
    if (settings.provider === 'ollama') return !!settings.ollama.model;
    if (settings.provider === 'openai') return !!settings.openai.hasKey && !!settings.openai.model;
    if (settings.provider === 'anthropic')
      return !!settings.anthropic.hasKey && !!settings.anthropic.model;
    if (settings.provider === 'bedrock')
      return !!settings.bedrock.hasCreds && !!settings.bedrock.model;
    return false;
  })();

  const executeAction = useCallback(
    (actionId: ExtendedActionKind, customInstruction?: string) => {
      if (!configReady) {
        setAiSettingsOpen(true);
        onClose();
        return;
      }
      const captured = target ?? getTarget(editor);
      if (!captured) return;

      let system: string;
      if (actionId === 'translate') {
        const lang = customInstruction || 'English';
        system = EXTENDED_SYSTEM_PROMPTS['translate'] + ` Target language: ${lang}.`;
      } else if (actionId === 'change-tone') {
        const tone = customInstruction || 'professional';
        system = EXTENDED_SYSTEM_PROMPTS['change-tone'] + ` Target tone: ${tone}.`;
      } else if (actionId === 'custom' && customInstruction) {
        system = `Follow the user's instruction precisely. Apply it to the provided text. Preserve markdown formatting. Output only the result.\n\nInstruction: ${customInstruction}`;
      } else {
        system = EXTENDED_SYSTEM_PROMPTS[actionId] || EXTENDED_SYSTEM_PROMPTS['improve'];
      }

      runCustom(system, captured.text);
    },
    [configReady, target, editor, runCustom, setAiSettingsOpen, onClose]
  );

  const onSubmit = useCallback(() => {
    if (busy) return;
    const trimmed = input.trim();
    if (!trimmed && selectedChip >= 0) {
      const action = QUICK_ACTIONS[selectedChip];
      executeAction(action.id, trimmed);
      return;
    }
    if (!trimmed) return;

    // Check if the input matches a known action
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('translate')) {
      const lang = trimmed.replace(/^translate\s*(to\s*)?/i, '').trim() || undefined;
      executeAction('translate', lang);
    } else {
      executeAction('custom', trimmed);
    }
  }, [busy, input, selectedChip, executeAction]);

  const onChipClick = useCallback(
    (action: QuickAction) => {
      if (busy) return;
      if (action.id === 'translate') {
        setInput('Translate to ');
        inputRef.current?.focus();
        return;
      }
      executeAction(action.id);
    },
    [busy, executeAction]
  );

  const onAccept = useCallback(() => {
    if (!editor || !output.trim() || !target) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: target.from, to: target.to })
      .insertContentAt(target.from, output)
      .run();
    clearOutput();
    onClose();
  }, [editor, output, target, clearOutput, onClose]);

  const onInsertBelow = useCallback(() => {
    if (!editor || !output.trim() || !target) return;
    editor
      .chain()
      .focus()
      .insertContentAt(target.to, '\n\n' + output)
      .run();
    clearOutput();
    onClose();
  }, [editor, output, target, clearOutput, onClose]);

  const onDiscard = useCallback(() => {
    clearOutput();
  }, [clearOutput]);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    } else if (e.key === 'Tab' && !busy) {
      e.preventDefault();
      if (selectedChip < 0) {
        setSelectedChip(0);
      } else {
        const action = QUICK_ACTIONS[selectedChip];
        if (action.id === 'translate') {
          setInput('Translate to ');
          setSelectedChip(-1);
        } else {
          executeAction(action.id);
        }
      }
    } else if (e.key === 'ArrowDown' && !busy) {
      e.preventDefault();
      setSelectedChip((i) => Math.min(i + 1, QUICK_ACTIONS.length - 1));
    } else if (e.key === 'ArrowUp' && !busy) {
      e.preventDefault();
      setSelectedChip((i) => Math.max(i - 1, -1));
    }
  };

  if (!position) return null;

  const hasOutput = output.trim().length > 0;
  const showResults = hasOutput || busy || !!lastError;

  return createPortal(
    <div
      ref={containerRef}
      className="fixed z-[9999] animate-fade-in"
      style={{ top: position.top, left: position.left }}
    >
      <div
        className={cn(
          'w-[420px] rounded-xl border border-border bg-bg-elevated/95 backdrop-blur-xl',
          'shadow-[0_8px_40px_rgba(0,0,0,0.25)] overflow-hidden'
        )}
      >
        {/* Input area */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle">
          <div className="flex-1 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setSelectedChip(-1);
              }}
              onKeyDown={onInputKeyDown}
              placeholder={target ? 'Ask AI to edit selection...' : 'Ask AI to edit this paragraph...'}
              disabled={busy}
              className={cn(
                'flex-1 bg-transparent text-[13px] text-text placeholder:text-text-subtle',
                'outline-none disabled:opacity-50'
              )}
            />
          </div>
          {!busy && (
            <button
              onClick={onSubmit}
              disabled={!input.trim() && selectedChip < 0}
              title="Run (Enter)"
              className="p-1 rounded-md text-text-muted hover:text-text hover:bg-bg-hover transition-colors disabled:opacity-30"
            >
              <CornerDownLeft size={14} />
            </button>
          )}
          {busy && (
            <button
              onClick={() => cancel()}
              title="Stop"
              className="p-1 rounded-md text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
            >
              <Square size={12} className="fill-current" />
            </button>
          )}
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="p-1 rounded-md text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Quick action chips */}
        {!showResults && (
          <div className="px-3 py-2 flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={action.id}
                onClick={() => onChipClick(action)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-colors',
                  i === selectedChip
                    ? 'bg-accent text-bg'
                    : 'bg-bg-hover text-text-muted hover:text-text hover:bg-bg-active'
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Target indicator */}
        {!showResults && target && (
          <div className="px-3 pb-2">
            <span className="text-[11px] text-text-subtle">
              {target.kind === 'selection' ? 'Selection' : 'Current paragraph'}
              {' · '}
              {target.text.length.toLocaleString()} chars
            </span>
          </div>
        )}

        {/* Streaming output / error */}
        {showResults && (
          <div className="border-t border-border-subtle">
            {lastError ? (
              <div className="px-3 py-2.5 flex items-start gap-2 text-[12px] text-red-500">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <span className="break-words whitespace-pre-wrap">{lastError}</span>
              </div>
            ) : (
              <div
                ref={outputRef}
                className="px-3 py-2.5 max-h-[200px] overflow-y-auto"
              >
                <div className="font-serif text-[12.5px] text-text leading-[1.6] whitespace-pre-wrap break-words">
                  {output || (
                    <span className="text-text-subtle italic">Generating...</span>
                  )}
                </div>
              </div>
            )}

            {/* Accept / Discard / Insert below buttons */}
            {!busy && hasOutput && !lastError && (
              <div className="px-3 py-2 border-t border-border-subtle flex items-center gap-1.5">
                <button
                  onClick={onAccept}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-bg rounded-md text-[12px] font-medium hover:bg-accent-hover transition-colors"
                >
                  <Check size={12} />
                  Accept
                </button>
                <button
                  onClick={onInsertBelow}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-[12px] text-text-muted hover:bg-bg-hover hover:text-text transition-colors"
                >
                  <ArrowDownToLine size={12} />
                  Insert below
                </button>
                <div className="flex-1" />
                <button
                  onClick={onDiscard}
                  className="px-2.5 py-1.5 text-[12px] text-text-subtle hover:text-text transition-colors"
                >
                  Discard
                </button>
              </div>
            )}

            {/* While busy, show a stop hint */}
            {busy && (
              <div className="px-3 py-1.5 border-t border-border-subtle">
                <span className="text-[11px] text-text-subtle">
                  Press Esc to stop
                </span>
              </div>
            )}

            {/* After error, allow retry */}
            {!busy && lastError && (
              <div className="px-3 py-2 border-t border-border-subtle flex items-center gap-1.5">
                <button
                  onClick={onDiscard}
                  className="px-3 py-1.5 text-[12px] text-text-muted hover:text-text transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
