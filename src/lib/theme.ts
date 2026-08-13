import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

let themeListeners = new Set<() => void>();
let currentTheme: Theme = "dark";

function initTheme() {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem("ascend-theme") as Theme | null;
    currentTheme = stored === "light" ? "light" : "dark";
  } catch {
    currentTheme = "dark";
  }
  applyTheme(currentTheme);
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#f0f4ff" : "#0b0714");
}

export function setTheme(theme: Theme) {
  currentTheme = theme;
  applyTheme(theme);
  try { localStorage.setItem("ascend-theme", theme); } catch {}
  themeListeners.forEach((l) => l());
}

export function toggleTheme() {
  setTheme(currentTheme === "dark" ? "light" : "dark");
}

function subscribeTheme(l: () => void) { themeListeners.add(l); return () => { themeListeners.delete(l); }; }
function getThemeSnapshot(): Theme { return currentTheme; }
function getThemeServerSnapshot(): Theme { return "dark"; }

export function useTheme(): { theme: Theme; setTheme: typeof setTheme; toggleTheme: typeof toggleTheme } {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  return { theme, setTheme, toggleTheme };
}

// Initialize on module load
initTheme();
