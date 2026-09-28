"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import styles from "./person.module.css";

type CustomizeModeContextValue = {
  isCustomizeMode: boolean;
  setCustomizeMode: (value: boolean) => void;
};

const CustomizeModeContext = createContext<CustomizeModeContextValue>({
  isCustomizeMode: false,
  setCustomizeMode: () => undefined,
});

export function OwnerCustomizeMode({ children }: { children: ReactNode }) {
  const [isCustomizeMode, setCustomizeMode] = useState(false);
  return <CustomizeModeContext.Provider value={{ isCustomizeMode, setCustomizeMode }}>{children}</CustomizeModeContext.Provider>;
}

export function useOwnerCustomizeMode() {
  return useContext(CustomizeModeContext);
}

export function OwnerCustomizeControls() {
  const { isCustomizeMode, setCustomizeMode } = useOwnerCustomizeMode();
  if (!isCustomizeMode) return <button type="button" className={styles.customizeButton} onClick={() => setCustomizeMode(true)}>Customize profile</button>;
  return <div className={styles.customizeModeControls}><span>Customize mode</span><button type="button" onClick={() => setCustomizeMode(false)}>Done</button></div>;
}

export function CustomizeModeOnly({ children }: { children: ReactNode }) {
  return useOwnerCustomizeMode().isCustomizeMode ? <>{children}</> : null;
}

export function OwnerCustomizeContent({ hasPublicContent, children }: { hasPublicContent: boolean; children: ReactNode }) {
  const { isCustomizeMode } = useOwnerCustomizeMode();
  return hasPublicContent || isCustomizeMode ? <>{children}</> : null;
}
