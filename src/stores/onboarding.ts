import { create } from 'zustand';

const KEY = 'second-brain.onboarding.v1';

interface OnboardingState {
  open: boolean;
  completed: boolean;
  start: () => void;
  finish: () => void;
  skip: () => void;
}

function readCompleted(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export const useOnboarding = create<OnboardingState>((set) => ({
  open: false,
  completed: readCompleted(),
  start: () => set({ open: true }),
  finish: () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    set({ open: false, completed: true });
  },
  skip: () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    set({ open: false, completed: true });
  },
}));
