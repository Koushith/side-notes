import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface SlashMenuState {
  active: boolean;
  query: string;
  range: { from: number; to: number } | null;
  rect: DOMRect | null;
}

export interface SlashMenuOptions {
  onStateChange?: (state: SlashMenuState) => void;
}

const pluginKey = new PluginKey<SlashMenuState>('slashMenu');

export const SlashMenu = Extension.create<SlashMenuOptions>({
  name: 'slashMenu',

  addOptions() {
    return {};
  },

  addProseMirrorPlugins() {
    const onStateChange = this.options.onStateChange;
    return [
      new Plugin<SlashMenuState>({
        key: pluginKey,
        state: {
          init: () => ({ active: false, query: '', range: null, rect: null }),
          apply(tr, prev) {
            const meta = tr.getMeta(pluginKey) as Partial<SlashMenuState> | undefined;
            if (meta) return { ...prev, ...meta };
            // Recompute based on current selection on every doc/selection change
            if (tr.docChanged || tr.selectionSet) {
              const { $from } = tr.selection;
              const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
              const m = before.match(/(?:^|\s)\/([\w-]*)$/);
              if (m) {
                const queryStart = $from.pos - m[1].length - 1; // include `/`
                return {
                  active: true,
                  query: m[1],
                  range: { from: queryStart, to: $from.pos },
                  rect: prev.rect,
                };
              }
              return { active: false, query: '', range: null, rect: null };
            }
            return prev;
          },
        },
        view() {
          let prevActive = false;
          let prevQuery = '';
          let prevFrom = -1;
          let prevTop = -1;
          let prevLeft = -1;
          return {
            update(view) {
              const state = pluginKey.getState(view.state);
              if (!state) return;
              const from = state.range?.from ?? -1;
              let top = -1;
              let left = -1;
              if (state.active && state.range) {
                try {
                  const coords = view.coordsAtPos(state.range.from);
                  top = coords.bottom;
                  left = coords.left;
                } catch {
                  /* ignore */
                }
              }
              if (
                state.active === prevActive &&
                state.query === prevQuery &&
                from === prevFrom &&
                top === prevTop &&
                left === prevLeft
              ) {
                return;
              }
              prevActive = state.active;
              prevQuery = state.query;
              prevFrom = from;
              prevTop = top;
              prevLeft = left;
              const rect = state.active && top !== -1 ? new DOMRect(left, top, 0, 0) : null;
              onStateChange?.({ ...state, rect });
            },
          };
        },
        props: {
          decorations(state) {
            const s = pluginKey.getState(state);
            if (!s?.active || !s.range) return null;
            return DecorationSet.create(state.doc, [
              Decoration.inline(s.range.from, s.range.to, { class: 'slash-active' }),
            ]);
          },
        },
      }),
    ];
  },
});

export function clearSlashRange(editor: import('@tiptap/core').Editor) {
  const state = pluginKey.getState(editor.state);
  if (state?.range) {
    editor.chain().focus().deleteRange(state.range).run();
  }
}
