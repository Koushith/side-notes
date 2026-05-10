import { useEditor, EditorContent, Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useVault } from '@/stores/vault';
import { useEditorRef } from '@/stores/editorRef';
import { useUi } from '@/stores/ui';
import { Wikilink, preprocessWikilinks } from './extensions/Wikilink';
import { Tag, preprocessTags } from './extensions/Tag';
import { SlashMenu, SlashMenuState, clearSlashRange } from './extensions/SlashMenu';
import { WikilinkSuggest, WikilinkSuggestState } from './extensions/WikilinkSuggest';
import { WikilinkAutocomplete } from './WikilinkAutocomplete';
import { MentionSuggest, MentionSuggestState } from './extensions/MentionSuggest';
import { MentionAutocomplete } from './MentionAutocomplete';
import { EditorBubbleMenu } from './EditorBubbleMenu';
import { TableBubbleMenu } from './TableBubbleMenu';
import { ViewModeTabs } from './ViewModeTabs';
import { DailyNoteHeader, isDailyNote } from './DailyNoteHeader';
import { resolveWikilink } from '@/lib/markdown';
import { api } from '@/lib/api';
import { joinPath, basenameNoExt, cn } from '@/lib/utils';
import { saveImageToVault } from '@/lib/images';
import { Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Code, Quote, Minus, Hash, Link2, Image as ImageIcon, Table as TableIcon, Pin } from 'lucide-react';

const lowlight = createLowlight(common);

interface EditorProps {
  rel: string;
  vaultPath: string;
}

export function Editor({ rel, vaultPath }: EditorProps) {
  const files = useVault((s) => s.files);
  const openFile = useVault((s) => s.openFile);
  const setSelectedTag = useVault((s) => s.setSelectedTag);
  const createFile = useVault((s) => s.createFile);
  const saveFile = useVault((s) => s.saveFile);
  const isPinned = useVault((s) => s.pinned.has(rel));

  const [slashState, setSlashState] = useState<SlashMenuState>({
    active: false,
    query: '',
    range: null,
    rect: null,
  });
  const [selectedSlashIdx, setSelectedSlashIdx] = useState(0);
  const [wikiState, setWikiState] = useState<WikilinkSuggestState>({
    active: false,
    query: '',
    range: null,
    rect: null,
  });
  const [mentionState, setMentionState] = useState<MentionSuggestState>({
    active: false,
    query: '',
    range: null,
    rect: null,
  });
  const editorRef = useRef<TiptapEditor | null>(null);
  const saveTimer = useRef<number | null>(null);
  const lastSavedRel = useRef<string>(rel);
  const currentRelRef = useRef<string>(rel);
  const vaultPathRef = useRef<string>(vaultPath);
  vaultPathRef.current = vaultPath;
  currentRelRef.current = rel;

  const dailyMode = isDailyNote(rel);
  const devMode = useUi((s) => s.devMode);
  const [dailyTitle, setDailyTitle] = useState('');
  const dailyTitleRef = useRef('');
  dailyTitleRef.current = dailyTitle;

  const filesArr = useMemo(() => [...files.values()], [files]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          codeBlock: false, // we use lowlight instead
        }),
        CodeBlockLowlight.configure({ lowlight }),
        Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
        Placeholder.configure({
          placeholder: 'Start typing, or press / for blocks…',
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Image.configure({ inline: false, allowBase64: false, HTMLAttributes: { class: 'note-image' } }),
        Table.configure({ resizable: true, HTMLAttributes: { class: 'note-table' } }),
        TableRow,
        TableHeader,
        TableCell,
        Markdown.configure({
          html: true,
          linkify: false,
          breaks: false,
          transformCopiedText: true,
          transformPastedText: true,
        }),
        Wikilink.configure({
          onClick: (target) => {
            const resolved = resolveWikilink(target, [...useVault.getState().files.values()]);
            if (resolved) {
              openFile(resolved);
            } else {
              createFile(target).catch(console.error);
            }
          },
          isResolved: (target) => Boolean(resolveWikilink(target, [...useVault.getState().files.values()])),
        }),
        Tag.configure({
          onClick: (tag) => setSelectedTag(tag),
        }),
        SlashMenu.configure({
          onStateChange: (s) => {
            setSlashState(s);
            setSelectedSlashIdx(0);
          },
        }),
        WikilinkSuggest.configure({
          onStateChange: (s) => setWikiState(s),
        }),
        MentionSuggest.configure({
          onStateChange: (s) => setMentionState(s),
        }),
      ],
      content: '',
      editorProps: {
        attributes: { class: 'prose-content focus:outline-none' },
        handlePaste: (view, event) => {
          const items = event.clipboardData?.items;
          if (!items) return false;
          for (const item of Array.from(items)) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
              const file = item.getAsFile();
              if (!file) continue;
              event.preventDefault();
              insertImage(file);
              return true;
            }
          }
          return false;
        },
        handleDrop: (view, event) => {
          const dt = event.dataTransfer;
          if (!dt) return false;
          if (dt.files && dt.files.length > 0) {
            const file = dt.files[0];
            if (file.type.startsWith('image/')) {
              event.preventDefault();
              insertImage(file);
              return true;
            }
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => {
          const md = (editor.storage as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();
          const cleaned = unrewriteImagePaths(md, lastSavedRel.current);
          const finalMd = isDailyNote(lastSavedRel.current)
            ? prependDailyTitle(dailyTitleRef.current, cleaned)
            : cleaned;
          saveFile(lastSavedRel.current, finalMd).catch(console.error);
        }, 400);
      },
    },
    []
  );

  editorRef.current = editor;

  // Expose the editor globally so the title bar (export, etc) can reach it.
  useEffect(() => {
    useEditorRef.getState().setEditor(editor);
    return () => {
      if (useEditorRef.getState().editor === editor) {
        useEditorRef.getState().setEditor(null);
      }
    };
  }, [editor]);

  async function insertImage(file: File) {
    if (!editor) return;
    try {
      const { mdPath } = await saveImageToVault(vaultPathRef.current, file, currentRelRef.current);
      // Convert the note-relative md path into a vault-absolute rel for the vault:// URL
      const noteFolder = currentRelRef.current.split('/').slice(0, -1).join('/');
      const vaultRel = mdPath.startsWith('..') ? normalizeRel(noteFolder, mdPath) : mdPath;
      editor.chain().focus().setImage({ src: `vault:///${vaultRel}`, alt: file.name }).run();
    } catch (err) {
      console.error('Image insert failed', err);
    }
  }

  // Load file content when rel changes
  useEffect(() => {
    if (!editor) return;
    let cancelled = false;
    (async () => {
      try {
        const full = joinPath(vaultPath, rel);
        const raw = await api.files.read(full);
        if (cancelled) return;
        const noFm = raw.replace(/^---\n[\s\S]*?\n---\n?/, '');
        // For daily notes, peel off the leading H1 and surface it as the masthead title.
        let body = noFm;
        if (isDailyNote(rel)) {
          const { title, rest } = extractFirstH1(noFm);
          setDailyTitle(title);
          body = rest;
        }
        const withImagePaths = rewriteImagePaths(vaultPath, body, rel);
        const withWikis = preprocessWikilinks(withImagePaths);
        const withTags = preprocessTags(withWikis);
        lastSavedRel.current = rel;
        editor.commands.setContent(withTags, false, { preserveWhitespace: 'full' });
        setTimeout(() => editor.commands.focus('end', { scrollIntoView: false }), 50);
      } catch (err) {
        console.error('Failed to load file', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rel, editor]);

  // Flush pending save on rel change / unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current && editorRef.current) {
        window.clearTimeout(saveTimer.current);
        const md = (editorRef.current.storage as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();
        const cleaned = unrewriteImagePaths(md, lastSavedRel.current);
        const finalMd = isDailyNote(lastSavedRel.current)
          ? prependDailyTitle(dailyTitleRef.current, cleaned)
          : cleaned;
        saveFile(lastSavedRel.current, finalMd).catch(console.error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rel]);

  // Persist title changes for daily notes (debounced via the same save timer logic)
  useEffect(() => {
    if (!dailyMode || !editor) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const md = (editor.storage as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();
      const cleaned = unrewriteImagePaths(md, lastSavedRel.current);
      const finalMd = prependDailyTitle(dailyTitleRef.current, cleaned);
      saveFile(lastSavedRel.current, finalMd).catch(console.error);
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyTitle, dailyMode]);

  const slashCommands = useMemo(() => buildSlashCommands(insertImage), [editor]);
  const filteredSlash = useMemo(() => {
    const q = slashState.query.toLowerCase();
    if (!q) return slashCommands;
    return slashCommands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.keywords ?? []).some((k) => k.toLowerCase().includes(q))
    );
  }, [slashCommands, slashState.query]);

  // Keyboard nav for slash menu — yields to wikilink + mention autocompletes
  useEffect(() => {
    if (!editor) return;
    const onKey = (e: KeyboardEvent) => {
      if (!slashState.active || wikiState.active || mentionState.active) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSlashIdx((i) => Math.min(i + 1, filteredSlash.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSlashIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredSlash[selectedSlashIdx];
        if (cmd) {
          clearSlashRange(editor);
          cmd.run(editor);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSlashState((s) => ({ ...s, active: false }));
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [editor, slashState.active, wikiState.active, filteredSlash, selectedSlashIdx]);

  const file = files.get(rel);
  const title = file?.title ?? basenameNoExt(rel);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {!dailyMode && (
        <div className="px-16 pt-14 pb-2">
          <div className="max-w-3xl mx-auto">
            {devMode && (
              <div className="flex justify-end mb-3">
                <ViewModeTabs />
              </div>
            )}
            <h1 className="font-serif text-[40px] font-semibold tracking-tight leading-[1.1] text-text">
              {title}
            </h1>
            <div className="text-[12.5px] text-text-muted mt-2.5 flex items-center gap-2 flex-wrap">
              {parentLabel(rel) && (
                <>
                  <span>{parentLabel(rel)}</span>
                  <span className="text-text-subtle">·</span>
                </>
              )}
              <span>Edited {formatRelativeTime(file?.mtime)}</span>
              {file?.tags.length ? (
                <>
                  <span className="text-text-subtle">·</span>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    {file.tags.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTag(t)}
                        className="font-mono text-[11px] px-1.5 py-[1px] rounded bg-tag-soft text-tag hover:brightness-95"
                      >
                        #{t}
                      </button>
                    ))}
                  </span>
                </>
              ) : null}
              {isPinned && (
                <>
                  <span className="text-text-subtle">·</span>
                  <span className="inline-flex items-center gap-1 text-accent">
                    <Pin size={11} className="fill-current" />
                    Pinned
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-16">
        <div className="max-w-3xl mx-auto">
          {dailyMode && (
            <>
              {devMode && (
                <div className="flex justify-end pt-6">
                  <ViewModeTabs />
                </div>
              )}
              <DailyNoteHeader rel={rel} title={dailyTitle} onTitleChange={setDailyTitle} />
            </>
          )}
          <EditorContent editor={editor} />
          {editor && <EditorBubbleMenu editor={editor} />}
          {editor && <TableBubbleMenu editor={editor} />}
        </div>
      </div>

      {editor && (
        <WikilinkAutocomplete
          state={wikiState}
          editor={editor}
          files={filesArr}
          onCreate={async (target) => {
            try {
              await createFile(target);
            } catch (err) {
              console.error(err);
            }
          }}
        />
      )}
      {editor && (
        <MentionAutocomplete
          state={mentionState}
          editor={editor}
          files={filesArr}
          onCreate={async (target) => {
            try {
              await createFile(target);
            } catch (err) {
              console.error(err);
            }
          }}
        />
      )}

      {slashState.active && !wikiState.active && !mentionState.active && slashState.rect && filteredSlash.length > 0 && (
        <div
          className="fixed z-50 w-72 max-h-80 overflow-y-auto rounded-lg border border-border bg-bg-elevated shadow-2xl animate-fade-in"
          style={{ left: slashState.rect.left, top: slashState.rect.top + 4 }}
        >
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-text-subtle">Insert</div>
          {filteredSlash.map((cmd, i) => (
            <button
              key={cmd.title}
              className={
                'w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-bg-hover transition-colors ' +
                (i === selectedSlashIdx ? 'bg-bg-hover' : '')
              }
              onMouseEnter={() => setSelectedSlashIdx(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!editor) return;
                clearSlashRange(editor);
                cmd.run(editor);
              }}
            >
              <span className="text-accent">{cmd.icon}</span>
              <div className="flex-1">
                <div className="text-text">{cmd.title}</div>
                {cmd.hint && <div className="text-xs text-text-subtle">{cmd.hint}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface SlashCmd {
  title: string;
  hint?: string;
  keywords?: string[];
  icon: React.ReactNode;
  run: (editor: TiptapEditor) => void;
}

function buildSlashCommands(insertImage: (file: File) => Promise<void>): SlashCmd[] {
  const i = (Icon: typeof Heading1) => <Icon size={16} />;
  return [
    { title: 'Heading 1', hint: 'Big section title', keywords: ['h1', 'title'], icon: i(Heading1), run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
    { title: 'Heading 2', hint: 'Medium heading', keywords: ['h2'], icon: i(Heading2), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { title: 'Heading 3', hint: 'Small heading', keywords: ['h3'], icon: i(Heading3), run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
    { title: 'Bullet list', hint: 'Simple bullets', keywords: ['ul', 'list'], icon: i(List), run: (e) => e.chain().focus().toggleBulletList().run() },
    { title: 'Numbered list', hint: '1, 2, 3…', keywords: ['ol', 'numbered'], icon: i(ListOrdered), run: (e) => e.chain().focus().toggleOrderedList().run() },
    { title: 'Todo list', hint: 'Checkboxes you can tick off', keywords: ['todo', 'check', 'task'], icon: i(CheckSquare), run: (e) => e.chain().focus().toggleTaskList().run() },
    { title: 'Quote', hint: 'Set off a passage', keywords: ['quote', 'blockquote'], icon: i(Quote), run: (e) => e.chain().focus().toggleBlockquote().run() },
    { title: 'Code block', hint: 'For code snippets', keywords: ['code', 'pre'], icon: i(Code), run: (e) => e.chain().focus().toggleCodeBlock().run() },
    { title: 'Table', hint: 'Add/remove rows & columns from the toolbar', keywords: ['table', 'grid'], icon: i(TableIcon), run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { title: 'Image', hint: 'From your computer', keywords: ['image', 'picture', 'photo'], icon: i(ImageIcon), run: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const f = input.files?.[0];
        if (f) insertImage(f);
      };
      input.click();
    } },
    { title: 'Divider', hint: 'Horizontal rule', keywords: ['hr', 'divider'], icon: i(Minus), run: (e) => e.chain().focus().setHorizontalRule().run() },
    { title: 'Wikilink', hint: 'Link to another note', keywords: ['link', 'wiki', 'note'], icon: i(Link2), run: (e) => e.chain().focus().insertContent('[[').run() },
    { title: 'Tag', hint: 'Add a #tag', keywords: ['tag', 'hashtag'], icon: i(Hash), run: (e) => e.chain().focus().insertContent('#').run() },
  ];
}

function parentLabel(rel: string): string {
  const parts = rel.split('/');
  if (parts.length < 2) return '';
  return parts[parts.length - 2];
}

function formatRelativeTime(ms?: number): string {
  if (!ms) return 'just now';
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk} wk ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr} yr${yr === 1 ? '' : 's'} ago`;
}

/** Strip a leading `# Title` line from the markdown — used for daily notes where the title
 *  is rendered separately in the masthead. */
function extractFirstH1(md: string): { title: string; rest: string } {
  const m = md.match(/^[ \t]*#[ \t]+(.+?)[ \t]*\n+/);
  if (!m) return { title: '', rest: md };
  return { title: m[1].trim(), rest: md.slice(m[0].length) };
}

function prependDailyTitle(title: string, body: string): string {
  const t = title.trim();
  // Always include a heading line, even if empty, so reload roundtrips cleanly.
  const head = t ? `# ${t}\n\n` : '';
  return head + body.replace(/^\n+/, '');
}

/** Rewrite relative `![](image.png)` paths in a note body into vault:// URLs
 *  so the renderer (Electron) can display them through our custom protocol handler. */
function rewriteImagePaths(_vaultPath: string, md: string, noteRel: string): string {
  const noteDir = noteRel.split('/').slice(0, -1).join('/');
  const parts = md.split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return part.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt, src) => {
        if (/^[a-z]+:\/\//i.test(src) || src.startsWith('data:')) return full;
        const resolved = normalizeRel(noteDir, src);
        return `![${alt}](vault:///${resolved})`;
      });
    })
    .join('');
}

/** Convert `vault:///<rel>` back to a path relative to the current note. */
function unrewriteImagePaths(md: string, noteRel: string): string {
  const noteDir = noteRel.split('/').slice(0, -1).join('/');
  return md.replace(/!\[([^\]]*)\]\(vault:\/\/\/?([^)\s]+)\)/g, (_full, alt, vaultRel) => {
    const rel = makeRelative(noteDir, decodeURI(vaultRel));
    return `![${alt}](${rel})`;
  });
}

function makeRelative(fromDir: string, toRel: string): string {
  const fromParts = fromDir ? fromDir.split('/') : [];
  const toParts = toRel.split('/');
  let i = 0;
  while (i < fromParts.length && i < toParts.length - 1 && fromParts[i] === toParts[i]) i++;
  const up = fromParts.length - i;
  const rel = [...Array(up).fill('..'), ...toParts.slice(i)].join('/');
  return rel || toRel;
}

function normalizeRel(fromDir: string, rel: string): string {
  const fromParts = fromDir ? fromDir.split('/') : [];
  const segs = rel.split('/');
  const out = [...fromParts];
  for (const s of segs) {
    if (s === '..') out.pop();
    else if (s !== '.' && s !== '') out.push(s);
  }
  return out.join('/');
}
