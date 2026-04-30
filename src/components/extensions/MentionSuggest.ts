import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface MentionSuggestState {
  active: boolean;
  query: string;
  range: { from: number; to: number } | null;
  rect: DOMRect | null;
}

export interface MentionSuggestOptions {
  onStateChange?: (state: MentionSuggestState) => void;
}

const pluginKey = new PluginKey<MentionSuggestState>('mentionSuggest');

/** Detects `@<query>` at the cursor (after whitespace or at line start) so we can
 *  show a unified picker for notes / tags / dates. */
export const MentionSuggest = Extension.create<MentionSuggestOptions>({
  name: 'mentionSuggest',

  addOptions() {
    return {};
  },

  addProseMirrorPlugins() {
    const onStateChange = this.options.onStateChange;
    return [
      new Plugin<MentionSuggestState>({
        key: pluginKey,
        state: {
          init: () => ({ active: false, query: '', range: null, rect: null }),
          apply(tr, prev) {
            const meta = tr.getMeta(pluginKey) as Partial<MentionSuggestState> | undefined;
            if (meta) return { ...prev, ...meta };
            if (tr.docChanged || tr.selectionSet) {
              const { $from } = tr.selection;
              const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
              // Match `@` after start-of-line or whitespace, with no `]` or newline in the query.
              const m = before.match(/(?:^|\s)@([\w-]*)$/);
              if (m) {
                const query = m[1];
                const queryStart = $from.pos - query.length;
                // The `@` itself is one position before queryStart
                return {
                  active: true,
                  query,
                  range: { from: queryStart - 1, to: $from.pos },
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
              Decoration.inline(s.range.from, s.range.to, { class: 'mention-typing' }),
            ]);
          },
        },
      }),
    ];
  },
});

export type MentionKind = 'note' | 'tag' | 'date';

/** Replace the active `@query` with the chosen mention. */
export function commitMention(
  editor: import('@tiptap/core').Editor,
  kind: MentionKind,
  value: string
) {
  const state = pluginKey.getState(editor.state);
  if (!state?.active || !state.range) return;
  const { from, to } = state.range;
  if (kind === 'note' || kind === 'date') {
    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContent({ type: 'wikilink', attrs: { target: value } })
      .insertContent(' ')
      .run();
  } else {
    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContent({ type: 'tag', attrs: { name: value } })
      .insertContent(' ')
      .run();
  }
}

export function dismissMention(editor: import('@tiptap/core').Editor) {
  const view = editor.view;
  view.dispatch(view.state.tr.setMeta(pluginKey, { active: false, query: '', range: null }));
}
