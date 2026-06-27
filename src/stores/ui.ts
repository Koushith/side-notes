import { create } from 'zustand';

interface UiState {
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  toggleFocus: () => void;
  rawMode: boolean;
  setRawMode: (v: boolean) => void;
  toggleRawMode: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  aiSettingsOpen: boolean;
  setAiSettingsOpen: (v: boolean) => void;
}

const FOCUS_KEY = 'second-brain.focusMode';
const RAW_KEY = 'second-brain.rawMode';
const SIDEBAR_KEY = 'second-brain.sidebarCollapsed';

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
  sidebarCollapsed: readBool(SIDEBAR_KEY),
  setSidebarCollapsed: (sidebarCollapsed) => {
    persistBool(SIDEBAR_KEY, sidebarCollapsed);
    set({ sidebarCollapsed });
  },
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    persistBool(SIDEBAR_KEY, next);
    set({ sidebarCollapsed: next });
  },
  aiSettingsOpen: false,
  setAiSettingsOpen: (aiSettingsOpen) => set({ aiSettingsOpen }),
}));
