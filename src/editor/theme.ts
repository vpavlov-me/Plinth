import { create } from "zustand";

/**
 * Colour theme. "system" follows the OS; "light" and "dark" pin it. The
 * choice is remembered per browser and applied as `data-theme` on <html>
 * (an inline script in the layout applies it before the first paint).
 */
export type ThemePreference = "system" | "light" | "dark";

export const THEME_KEY = "plinth.theme.v1";

const ORDER: ThemePreference[] = ["system", "light", "dark"];

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function applyPreference(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === "system") delete root.dataset.theme;
  else root.dataset.theme = preference;
}

type ThemeState = {
  /** Null until read on the client, so the server render stays neutral. */
  preference: ThemePreference | null;
  load: () => void;
  setPreference: (preference: ThemePreference) => void;
  /** System → Light → Dark → System. */
  cycle: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: null,
  load: () => set({ preference: readPreference() }),
  setPreference: (preference) => {
    try {
      if (preference === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, preference);
    } catch {
      // Private mode: the theme simply isn't remembered.
    }
    applyPreference(preference);
    set({ preference });
  },
  cycle: () => {
    const current = get().preference ?? "system";
    get().setPreference(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!);
  },
}));

/** Runs inline in <head> before the first paint, so a pinned theme never flashes. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
