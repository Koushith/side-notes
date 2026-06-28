import { BubbleMenu, type Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Highlighter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { promptUser } from '../modals/PromptDialog';

interface Props {
  editor: Editor;
}

export function EditorBubbleMenu({ editor }: Props) {
  const isActive = (name: string, attrs?: Record<string, unknown>) => editor.isActive(name, attrs);

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100, animation: 'shift-away', arrow: false, maxWidth: 'none' }}
      shouldShow={({ editor, from, to }) => {
        if (from === to) return false;
        if (editor.isActive('codeBlock')) return false;
        return true;
      }}
      className="bubble-menu flex items-center gap-0.5 px-1 py-1 w-max"
    >
      <ToolButton
        active={isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        <Heading1 size={14} />
      </ToolButton>
      <ToolButton
        active={isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        <Heading2 size={14} />
      </ToolButton>
      <ToolButton
        active={isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        <Heading3 size={14} />
      </ToolButton>
      <Separator />
      <ToolButton
        active={isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (⌘B)"
      >
        <Bold size={14} />
      </ToolButton>
      <ToolButton
        active={isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (⌘I)"
      >
        <Italic size={14} />
      </ToolButton>
      <ToolButton
        active={isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough size={14} />
      </ToolButton>
      <ToolButton
        active={isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline code"
      >
        <Code size={14} />
      </ToolButton>
      <ToolButton
        active={isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Highlight"
      >
        <Highlighter size={14} />
      </ToolButton>
      <Separator />
      <ToolButton
        active={isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list (⌘⇧8)"
      >
        <List size={14} />
      </ToolButton>
      <ToolButton
        active={isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list (⌘⇧7)"
      >
        <ListOrdered size={14} />
      </ToolButton>
      <ToolButton
        active={isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Task list (⌘⇧9)"
      >
        <ListChecks size={14} />
      </ToolButton>
      <ToolButton
        active={isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Quote"
      >
        <Quote size={14} />
      </ToolButton>
      <Separator />
      <ToolButton
        active={isActive('link')}
        onClick={async () => {
          const url = await promptUser({
            title: 'Link',
            placeholder: 'https://…',
            defaultValue: editor.getAttributes('link').href ?? 'https://',
            okLabel: 'Apply',
          });
          if (url === null) return;
          if (url === '') {
            editor.chain().focus().unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }}
        title="Add link"
      >
        <Link2 size={14} />
      </ToolButton>
    </BubbleMenu>
  );
}

function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors text-text-muted hover:text-text hover:bg-bg-hover',
        active && 'text-accent bg-accent/15 hover:text-accent'
      )}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-5 bg-border mx-0.5" />;
}
