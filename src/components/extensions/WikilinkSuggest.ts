import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface WikilinkCandidate {
  rel: string;
  title: string;
  name: string;
}

export interface WikilinkSuggestState {
  active: boolean;
  query: string;
  range: { from: number; to: number } | null;
  rect: DOMRect | null;
}

export interface WikilinkSuggestOptions {
  onStateChange?: (state: WikilinkSuggestState) => void;
}

const pluginKey = new PluginKey<WikilinkSuggestState>('wikilinkSuggest');

/** Detects when the caret is between `[[ ` and the end of the current line.
 *  Captures whatever the user has typed after `[[` so we can fuzzy-match note titles. */
export const WikilinkSuggest = Extension.create<WikilinkSuggestOptions>({
  name: 'wikilinkSuggest',

  addOptions() {
    return {};
  },

  addProseMirrorPlugins() {
    const onStateChange = this.options.onStateChange;
    return [
      new Plugin<WikilinkSuggestState>({
        key: pluginKey,
        state: {
          init: () => ({ active: false, query: '', range: null, rect: null }),
          apply(tr, prev) {
            const meta = tr.getMeta(pluginKey) as Partial<WikilinkSuggestState> | undefined;
            if (meta) return { ...prev, ...meta };
            if (tr.docChanged || tr.selectionSet) {
              const { $from } = tr.selection;
              const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
              // Match `[[<query>` where query has no `]` or newline in it
              const m = before.match(/\[\[([^\]\n]*)$/);
              if (m) {
                const query = m[1];
                const queryStart = $from.pos - query.length;
                return {
                  active: true,
                  query,
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
              // Skip if nothing meaningful changed — otherwise we re-fire React
              // setState on every transaction and create an infinite loop.
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
            // Find the `[[` itself (2 chars before query start) so we can highlight
            const from = Math.max(0, s.range.from - 2);
            return DecorationSet.create(state.doc, [
              Decoration.inline(from, s.range.to, { class: 'wikilink-typing' }),
            ]);
          },
        },
      }),
    ];
  },
});

/** Replace the active `[[query` (and the trailing `]]` if user already typed it)
 *  with a Wikilink node pointing to `target`. */
export function commitWikilink(
  editor: import('@tiptap/core').Editor,
  target: string
) {
  const state = pluginKey.getState(editor.state);
  if (!state?.active || !state.range) return;
  const { from, to } = state.range;
  const start = Math.max(0, from - 2); // include `[[`
  // Look ahead for closing `]]`
  const after = editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to + 2));
  const end = after === ']]' ? to + 2 : to;
  editor
    .chain()
    .focus()
    .deleteRange({ from: start, to: end })
    .insertContent({ type: 'wikilink', attrs: { target } })
    .insertContent(' ')
    .run();
}
