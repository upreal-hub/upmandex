"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

type SiteTheme = "day" | "night";

type SiteThemeContextValue = {
  theme: SiteTheme;
  toggleTheme: () => void;
};

const SiteThemeContext = createContext<SiteThemeContextValue | null>(null);
const THEME_EVENT = "upmandex-theme-change";

function getThemeSnapshot(): SiteTheme {
  if (typeof window === "undefined") return "day";
  let savedTheme: string | null = null;
  try { savedTheme = window.localStorage.getItem("upmandex-theme"); } catch { savedTheme = document.documentElement.dataset.theme ?? null; }
  if (savedTheme === "day" || savedTheme === "night") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
}

function getServerThemeSnapshot(): SiteTheme {
  return "day";
}

function subscribeToTheme(onStoreChange: () => void) {
  const syncTheme = () => {
    document.documentElement.dataset.theme = getThemeSnapshot();
    onStoreChange();
  };
  const preference = window.matchMedia("(prefers-color-scheme: dark)");
  preference.addEventListener("change", syncTheme);
  window.addEventListener("storage", syncTheme);
  window.addEventListener(THEME_EVENT, syncTheme);
  return () => {
    preference.removeEventListener("change", syncTheme);
    window.removeEventListener("storage", syncTheme);
    window.removeEventListener(THEME_EVENT, syncTheme);
  };
}

export function useSiteTheme() {
  const context = useContext(SiteThemeContext);
  if (!context) throw new Error("useSiteTheme must be used within SiteThemeProvider");
  return context;
}

export default function SiteThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  const toggleTheme = useCallback(() => {
    const nextTheme = getThemeSnapshot() === "day" ? "night" : "day";
    try { window.localStorage.setItem("upmandex-theme", nextTheme); } catch {}
    const applyTheme = () => {
      document.documentElement.dataset.theme = nextTheme;
      window.dispatchEvent(new Event(THEME_EVENT));
    };
    if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.startViewTransition(applyTheme);
    } else applyTheme();
  }, []);

  const value = useMemo<SiteThemeContextValue>(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <SiteThemeContext.Provider value={value}>{children}</SiteThemeContext.Provider>;
}
