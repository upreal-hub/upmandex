"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

type SiteTheme = "day" | "night";

type SiteThemeContextValue = {
  theme: SiteTheme;
  toggleTheme: () => void;
};

const SiteThemeContext = createContext<SiteThemeContextValue | null>(null);
const THEME_EVENT = "upmandex-theme-change";

function getThemeSnapshot(): SiteTheme {
  if (typeof window === "undefined") return "day";
  const savedTheme = window.localStorage.getItem("upmandex-theme");
  if (savedTheme === "day" || savedTheme === "night") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
}

function getServerThemeSnapshot(): SiteTheme {
  return "day";
}

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_EVENT, onStoreChange);
  };
}

export function useSiteTheme() {
  const context = useContext(SiteThemeContext);
  if (!context) throw new Error("useSiteTheme must be used within SiteThemeProvider");
  return context;
}

export default function SiteThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const nextTheme = getThemeSnapshot() === "day" ? "night" : "day";
    window.localStorage.setItem("upmandex-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const value = useMemo<SiteThemeContextValue>(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <SiteThemeContext.Provider value={value}>{children}</SiteThemeContext.Provider>;
}
