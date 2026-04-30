import { BubbleMenu, type Editor } from '@tiptap/react';
import { Bold, Italic, Strikethrough, Code, Link2, Heading1, Heading2, Heading3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  editor: Editor;
}

export function EditorBubbleMenu({ editor }: Props) {
  const isActive = (name: string, attrs?: Record<string, unknown>) => editor.isActive(name, attrs);

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100, animation: 'shift-away' }}
      shouldShow={({ editor, from, to }) => {
        if (from === to) return false;
        if (editor.isActive('codeBlock')) return false;
        return true;
      }}
      className="flex items-center gap-0.5 rounded-lg border border-border bg-bg-elevated shadow-2xl px-1 py-1"
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
      <Separator />
      <ToolButton
        active={isActive('link')}
        onClick={() => {
          const url = window.prompt('URL', editor.getAttributes('link').href ?? 'https://');
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
