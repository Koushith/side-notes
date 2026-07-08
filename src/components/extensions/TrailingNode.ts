import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const TrailingNode = Extension.create({
  name: 'trailingNode',

  addProseMirrorPlugins() {
    const notAfter = ['paragraph'];

    return [
      new Plugin({
        key: new PluginKey('trailingNode'),
        appendTransaction(_, __, state) {
          const { doc, tr } = state;
          const lastNode = doc.lastChild;
          if (!lastNode || !notAfter.includes(lastNode.type.name)) {
            const paragraph = state.schema.nodes.paragraph.create();
            tr.insert(doc.content.size, paragraph);
            return tr;
          }
          return undefined;
        },
      }),
    ];
  },
});
