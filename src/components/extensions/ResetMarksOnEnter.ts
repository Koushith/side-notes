import { Extension } from '@tiptap/core';

export const ResetMarksOnEnter = Extension.create({
  name: 'resetMarksOnEnter',

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;
        const parent = $from.parent;
        if (parent.type.name === 'paragraph' && parent.textContent === '') {
          const { storedMarks } = state;
          const activeMarks = storedMarks ?? $from.marks();
          if (activeMarks.length > 0) {
            editor.commands.unsetAllMarks();
            return false;
          }
        }
        return false;
      },
    };
  },
});
