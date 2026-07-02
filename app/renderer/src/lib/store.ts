import { create } from "zustand";

type Theme = "dark" | "light";

interface AppState {
  theme: Theme;
  revision: number;
  setTheme: (theme: Theme) => void;
  refresh: () => void;
}

const savedTheme = (globalThis.localStorage?.getItem("argus-theme") as Theme | null) || "dark";

export const useAppStore = create<AppState>((set) => ({
  theme: savedTheme,
  revision: 0,
  setTheme: (theme) => {
    globalThis.localStorage?.setItem("argus-theme", theme);
    set({ theme });
  },
  refresh: () => set((state) => ({ revision: state.revision + 1 }))
}));
