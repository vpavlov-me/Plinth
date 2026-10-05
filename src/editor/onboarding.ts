import { create } from "zustand";

/**
 * First-visit hint. It's shown until the user closes it or exports their
 * first image, and never again after that (remembered per browser).
 */
const KEY = "plinth.onboarding.v1";

function readDone(): boolean {
  try {
    return localStorage.getItem(KEY) === "done";
  } catch {
    return false;
  }
}

type OnboardingState = {
  /** Null until read on the client, so the server render never shows the hint. */
  done: boolean | null;
  load: () => void;
  complete: () => void;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  done: null,
  load: () => set({ done: readDone() }),
  complete: () => {
    try {
      localStorage.setItem(KEY, "done");
    } catch {
      // Private mode: the hint simply stays dismissed for this session.
    }
    set({ done: true });
  },
}));

export const completeOnboarding = () => useOnboardingStore.getState().complete();
