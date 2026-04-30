import { create } from 'zustand';
import type { Editor } from '@tiptap/core';

interface EditorRefState {
  editor: Editor | null;
  setEditor: (e: Editor | null) => void;
}

export const useEditorRef = create<EditorRefState>((set) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
}));
