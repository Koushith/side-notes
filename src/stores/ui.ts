import { create } from 'zustand';

interface UiState {
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  toggleFocus: () => void;
}

const KEY = 'second-brain.focusMode';

function readInitial(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function persist(v: boolean) {
  try {
    localStorage.setItem(KEY, v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export const useUi = create<UiState>((set, get) => ({
  focusMode: readInitial(),
  setFocusMode: (focusMode) => {
    persist(focusMode);
    set({ focusMode });
  },
  toggleFocus: () => {
    const next = !get().focusMode;
    persist(next);
    set({ focusMode: next });
  },
}));
