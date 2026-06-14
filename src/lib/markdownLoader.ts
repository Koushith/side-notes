import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/react';

// tiptap-markdown 0.8.10 has a parse bug: its code-block `updateDOM` hook does
//   element.innerHTML = element.innerHTML.replace(/\n<\/code><\/pre>/g, ...)
// on the WHOLE rendered document. That re-serialize + re-parse round-trip mangles
// notes that contain a blank line inside a fenced code block (e.g. multi-section
// mermaid diagrams): the fence splits, entities double-escape (`-->` shows as
// `--&gt;`), and the rest of the document's HTML leaks into the code block as
// literal text. markdown-it's own render is clean — only the post-render DOM
// surgery corrupts it.
//
// We can't upgrade (0.9.0 needs Tiptap v3), so on load we bypass the broken parser:
// reuse the editor's already-configured markdown-it (so task lists, tables,
// langPrefix, wikilink/tag HTML all match exactly), render to clean HTML, run the
// same inter-block newline normalization tiptap-markdown does, then build the
// ProseMirror doc against the live editor schema — never touching the buggy
// whole-document innerHTML re-serialization.
//
// Returns a ProseMirror JSON doc. Pass it to `editor.commands.setContent(...)`:
// the Markdown extension's setContent override runs `parser.parse(content)` first,
// but parser.parse returns non-string content unchanged, so JSON passes straight
// through to the core command.

type MarkdownStorage = {
  markdown?: { parser?: { md?: { render: (src: string) => string } } };
};

export function markdownToDoc(editor: Editor, markdown: string): unknown | null {
  const md = (editor.storage as MarkdownStorage).markdown?.parser?.md;
  if (!md || typeof md.render !== 'function') return null;

  // markdown-it's render is clean; the corruption lives in tiptap-markdown's
  // post-render DOM step, which we skip entirely here.
  const html = md.render(markdown);
  const body = new window.DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;

  // Mirror tiptap-markdown's normalizeDOM: strip the leading "\n" markdown-it
  // appends between block elements (but never inside <pre>, where it's content).
  body.querySelectorAll('*').forEach((el) => {
    const next = el.nextSibling;
    if (next && next.nodeType === Node.TEXT_NODE && !el.closest('pre')) {
      next.textContent = (next.textContent ?? '').replace(/^\n/, '');
    }
  });

  // Strip the single trailing newline markdown-it puts before </code></pre>. We do
  // it locally on each code node's text instead of via a whole-document innerHTML
  // replace (that whole-document replace is the bug we're working around).
  body.querySelectorAll('pre > code').forEach((code) => {
    if (code.textContent && code.textContent.endsWith('\n')) {
      code.textContent = code.textContent.replace(/\n$/, '');
    }
  });

  const node = ProseMirrorDOMParser.fromSchema(editor.schema).parse(body, {
    preserveWhitespace: 'full',
  });
  return node.toJSON();
}
