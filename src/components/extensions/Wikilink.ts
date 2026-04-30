import { Node, mergeAttributes, InputRule } from '@tiptap/core';

export interface WikilinkOptions {
  onClick?: (target: string) => void;
  isResolved?: (target: string) => boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikilink: {
      insertWikilink: (target: string) => ReturnType;
    };
  }
}

export const Wikilink = Node.create<WikilinkOptions>({
  name: 'wikilink',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addOptions() {
    return {};
  },

  addAttributes() {
    return {
      target: { default: '' },
      label: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a.wikilink',
        getAttrs: (el) => {
          const node = el as HTMLElement;
          return {
            target: node.getAttribute('data-target') ?? node.textContent ?? '',
            label: node.getAttribute('data-label') ?? null,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const target = node.attrs.target as string;
    const label = (node.attrs.label as string | null) ?? target;
    const broken = this.options.isResolved && !this.options.isResolved(target);
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        class: `wikilink${broken ? ' is-broken' : ''}`,
        'data-target': target,
        'data-label': node.attrs.label ?? '',
        href: '#',
      }),
      label,
    ];
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]\n|]+?)(?:\|([^\]\n]+))?\]\]$/,
        handler: ({ state, range, match }) => {
          const target = match[1].trim();
          const label = match[2]?.trim() ?? null;
          const node = this.type.create({ target, label });
          state.tr.replaceWith(range.from, range.to, node);
        },
      }),
    ];
  },

  addCommands() {
    return {
      insertWikilink:
        (target: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { target },
          });
        },
    };
  },

  addProseMirrorPlugins() {
    const onClick = this.options.onClick;
    if (!onClick) return [];
    return [];
  },

  // tiptap-markdown reads this to know how to serialize the node back to plain `[[X]]`
  addStorage() {
    return {
      markdown: {
        serialize(state: { write: (s: string) => void }, node: { attrs: { target: string; label: string | null } }) {
          const target = (node.attrs.target ?? '').trim();
          const label = node.attrs.label?.trim();
          state.write(label ? `[[${target}|${label}]]` : `[[${target}]]`);
        },
        parse: {},
      },
    };
  },

  // Click handling via DOM (cleaner than PM plugin for this use case)
  onCreate() {
    const view = this.editor.view;
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a.wikilink') as HTMLElement | null;
      if (!link) return;
      e.preventDefault();
      e.stopPropagation();
      const t = link.getAttribute('data-target') ?? '';
      this.options.onClick?.(t);
    };
    view.dom.addEventListener('click', handler);
    (this.editor.storage as Record<string, unknown>)._wikilinkCleanup = () =>
      view.dom.removeEventListener('click', handler);
  },

  onDestroy() {
    const cleanup = (this.editor.storage as Record<string, unknown>)._wikilinkCleanup as
      | (() => void)
      | undefined;
    cleanup?.();
  },
});

/** Pre-process markdown so the Wikilink node's parseHTML can pick it up.
 *  We replace `[[Target]]` and `[[Target|Label]]` with `<a class="wikilink">` nodes,
 *  but only outside fenced code blocks and inline code.
 */
export function preprocessWikilinks(md: string): string {
  // Split on fenced code blocks; transform only the non-code chunks.
  const parts = md.split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  return parts
    .map((part, i) =>
      i % 2 === 0
        ? part.replace(/\[\[([^\]\n|]+?)(?:\|([^\]\n]+))?\]\]/g, (_full, target, label) => {
            const t = String(target).trim();
            const l = label ? String(label).trim() : '';
            const labelText = l || t;
            const labelAttr = l ? ` data-label="${escapeHtml(l)}"` : '';
            return `<a class="wikilink" data-target="${escapeHtml(t)}"${labelAttr}>${escapeHtml(labelText)}</a>`;
          })
        : part
    )
    .join('');
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
