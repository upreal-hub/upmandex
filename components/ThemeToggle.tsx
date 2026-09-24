"use client";

import { useSiteTheme } from "@/components/SiteThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useSiteTheme();
  const isNight = theme === "night";

  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme}
      aria-label={isNight ? "Switch to day mode" : "Switch to night mode"} aria-pressed={isNight}>
      <span aria-hidden="true" className="theme-toggle-sun">☀</span>
      <span aria-hidden="true" className="theme-toggle-moon">☾</span>
      <span className="sr-only">{isNight ? "Night mode" : "Day mode"}</span>
    </button>
  );
}
