import { X, Check, Link2, ListTodo, Tag, Type } from 'lucide-react';
import { useNoteIntelligence } from '@/stores/noteIntelligence';
import { useVault } from '@/stores/vault';
import { cn } from '@/lib/utils';

export function IntelligenceHints() {
  const enabled = useNoteIntelligence((s) => s.enabled);
  const tags = useNoteIntelligence((s) => s.tags);
  const title = useNoteIntelligence((s) => s.title);
  const todos = useNoteIntelligence((s) => s.todos);
  const links = useNoteIntelligence((s) => s.links);
  const continuation = useNoteIntelligence((s) => s.continuation);
  const dismissTag = useNoteIntelligence((s) => s.dismissTag);
  const dismissTitle = useNoteIntelligence((s) => s.dismissTitle);
  const dismissTodos = useNoteIntelligence((s) => s.dismissTodos);
  const dismissContinuation = useNoteIntelligence((s) => s.dismissContinuation);
  const openFile = useVault((s) => s.openFile);

  if (!enabled) return null;

  const hasAnything =
    (tags && !tags.dismissed && tags.tags.length > 0) ||
    (title && !title.dismissed) ||
    (todos && !todos.dismissed && todos.items.length > 0) ||
    links.length > 0 ||
    (continuation && !continuation.dismissed);

  if (!hasAnything) return null;

  return (
    <div className="border-t border-border-subtle px-8 py-3 space-y-2 bg-bg-elevated/50 text-[12px]">
      {/* Tag suggestions */}
      {tags && !tags.dismissed && tags.tags.length > 0 && (
        <HintRow icon={<Tag size={12} />} onDismiss={dismissTag}>
          <span className="text-text-muted mr-1.5">Suggested tags:</span>
          {tags.tags.map((t) => (
            <span key={t} className="px-2 py-0.5 bg-tag-soft text-tag rounded-md text-[11px] font-medium mr-1">
              #{t}
            </span>
          ))}
        </HintRow>
      )}

      {/* Title suggestion */}
      {title && !title.dismissed && (
        <HintRow icon={<Type size={12} />} onDismiss={dismissTitle}>
          <span className="text-text-muted mr-1.5">Suggested title:</span>
          <span className="text-text italic">{title.title}</span>
        </HintRow>
      )}

      {/* Todo extraction */}
      {todos && !todos.dismissed && todos.items.length > 0 && (
        <HintRow icon={<ListTodo size={12} />} onDismiss={dismissTodos}>
          <span className="text-text-muted">
            {todos.items.length} action item{todos.items.length > 1 ? 's' : ''} detected
          </span>
          <span className="text-text-subtle mx-1">·</span>
          <span className="text-accent-ink text-[11px]">
            {todos.items.slice(0, 2).map((t) => t.text).join(', ')}
            {todos.items.length > 2 && ` +${todos.items.length - 2} more`}
          </span>
        </HintRow>
      )}

      {/* Link suggestions */}
      {links.length > 0 && (
        <HintRow icon={<Link2 size={12} />}>
          <span className="text-text-muted mr-1.5">Related:</span>
          {links.map((l, i) => (
            <span key={l.targetRel}>
              {i > 0 && <span className="text-text-subtle mx-1">·</span>}
              <button
                onClick={() => openFile(l.targetRel)}
                className="text-link hover:underline"
                title={l.reason}
              >
                {l.targetTitle}
              </button>
            </span>
          ))}
        </HintRow>
      )}

      {/* Continue writing */}
      {continuation && !continuation.dismissed && (
        <HintRow onDismiss={dismissContinuation}>
          <span className="text-text-subtle italic">{continuation.text.slice(0, 80)}…</span>
          <button className="ml-2 text-accent-ink text-[11px] font-medium hover:underline">
            Tab to continue
          </button>
        </HintRow>
      )}
    </div>
  );
}

function HintRow({
  icon,
  children,
  onDismiss,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 group">
      {icon && <span className="text-text-subtle shrink-0">{icon}</span>}
      <div className="flex items-center flex-wrap gap-0.5 flex-1 min-w-0">
        {children}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-0.5 text-text-subtle hover:text-text opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}
