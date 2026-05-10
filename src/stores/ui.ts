import { create } from 'zustand';

interface UiState {
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  toggleFocus: () => void;
  rawMode: boolean;
  setRawMode: (v: boolean) => void;
  toggleRawMode: () => void;
  devMode: boolean;
  setDevMode: (v: boolean) => void;
  toggleDevMode: () => void;
}

const FOCUS_KEY = 'second-brain.focusMode';
const RAW_KEY = 'second-brain.rawMode';
const DEV_KEY = 'second-brain.devMode';

function readBool(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function persistBool(key: string, v: boolean) {
  try {
    localStorage.setItem(key, v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export const useUi = create<UiState>((set, get) => ({
  focusMode: readBool(FOCUS_KEY),
  setFocusMode: (focusMode) => {
    persistBool(FOCUS_KEY, focusMode);
    set({ focusMode });
  },
  toggleFocus: () => {
    const next = !get().focusMode;
    persistBool(FOCUS_KEY, next);
    set({ focusMode: next });
  },
  rawMode: readBool(RAW_KEY),
  setRawMode: (rawMode) => {
    persistBool(RAW_KEY, rawMode);
    set({ rawMode });
  },
  toggleRawMode: () => {
    const next = !get().rawMode;
    persistBool(RAW_KEY, next);
    set({ rawMode: next });
  },
  devMode: readBool(DEV_KEY),
  setDevMode: (devMode) => {
    persistBool(DEV_KEY, devMode);
    // Turning dev mode off snaps the user back to the rendered preview so
    // they don't end up stuck looking at raw markdown with no way out.
    if (!devMode) {
      persistBool(RAW_KEY, false);
      set({ devMode, rawMode: false });
    } else {
      set({ devMode });
    }
  },
  toggleDevMode: () => {
    get().setDevMode(!get().devMode);
  },
}));
