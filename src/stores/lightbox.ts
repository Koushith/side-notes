import { create } from 'zustand';

// What the fullscreen viewer is showing. SVG (mermaid diagrams) or an image URL.
export type LightboxContent =
  | { kind: 'svg'; svg: string; title?: string }
  | { kind: 'image'; src: string; title?: string };

interface LightboxState {
  content: LightboxContent | null;
  open: (content: LightboxContent) => void;
  close: () => void;
}

export const useLightbox = create<LightboxState>((set) => ({
  content: null,
  open: (content) => set({ content }),
  close: () => set({ content: null }),
}));
