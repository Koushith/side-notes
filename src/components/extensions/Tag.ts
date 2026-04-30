import { Node, mergeAttributes, InputRule } from '@tiptap/core';

export interface TagOptions {
  onClick?: (tag: string) => void;
}

export const Tag = Node.create<TagOptions>({
  name: 'tag',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: false,

  addOptions() {
    return {};
  },

  addAttributes() {
    return {
      name: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.tag',
        getAttrs: (el) => ({
          name: (el as HTMLElement).getAttribute('data-name') ?? (el as HTMLElement).textContent?.replace(/^#/, '') ?? '',
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: 'tag', 'data-name': node.attrs.name }),
      `#${node.attrs.name}`,
    ];
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|\s)(#([A-Za-z][A-Za-z0-9_\-/]{0,63}))\s$/,
        handler: ({ state, range, match }) => {
          const name = match[2];
          // We replace the `#tag` portion only — keep leading whitespace and trailing space.
          const fullMatch = match[0];
          const trailingSpace = fullMatch.endsWith(' ') ? 1 : 0;
          const tagStart = range.to - trailingSpace - match[1].length;
          const node = this.type.create({ name });
          state.tr.replaceWith(tagStart, range.to - trailingSpace, node);
        },
      }),
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: { write: (s: string) => void }, node: { attrs: { name: string } }) {
          state.write(`#${node.attrs.name}`);
        },
        parse: {},
      },
    };
  },

  onCreate() {
    const view = this.editor.view;
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const tag = target.closest('span.tag') as HTMLElement | null;
      if (!tag) return;
      e.preventDefault();
      const name = tag.getAttribute('data-name') ?? '';
      this.options.onClick?.(name);
    };
    view.dom.addEventListener('click', handler);
    (this.editor.storage as Record<string, unknown>)._tagCleanup = () =>
      view.dom.removeEventListener('click', handler);
  },

  onDestroy() {
    const cleanup = (this.editor.storage as Record<string, unknown>)._tagCleanup as
      | (() => void)
      | undefined;
    cleanup?.();
  },
});

export function preprocessTags(md: string): string {
  // Avoid replacing inside code blocks and inline code; also avoid markdown headings (#)
  const parts = md.split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
      // Process line by line so we can skip headings
      return part
        .split('\n')
        .map((line) => {
          if (/^\s*#+\s/.test(line)) return line;
          return line.replace(
            /(^|[\s(>])#([A-Za-z][A-Za-z0-9_\-/]{0,63})\b/g,
            (_m, lead, name) => `${lead}<span class="tag" data-name="${name}">#${name}</span>`
          );
        })
        .join('\n');
    })
    .join('');
}
