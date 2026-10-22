"use client";

import Link from "next/link";
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

export function OwnerCustomizeMode({ children, initialCustomizeMode = false }: { children: ReactNode; initialCustomizeMode?: boolean }) {
  const [isCustomizeMode, setCustomizeMode] = useState(initialCustomizeMode);
  return <CustomizeModeContext.Provider value={{ isCustomizeMode, setCustomizeMode }}>{children}</CustomizeModeContext.Provider>;
}

export function useOwnerCustomizeMode() {
  return useContext(CustomizeModeContext);
}

export function OwnerCustomizeControls({ personId }: { personId: string }) {
  const { isCustomizeMode, setCustomizeMode } = useOwnerCustomizeMode();
  return <nav className={styles.profileTabs} aria-label="My Profile"><button type="button" aria-pressed={!isCustomizeMode} onClick={() => setCustomizeMode(false)}>☁ My Profile</button><button type="button" aria-pressed={isCustomizeMode} onClick={() => setCustomizeMode(true)}>✧ Customization</button><Link href={`/people/${encodeURIComponent(personId)}/art`}>✎ My Workshop</Link></nav>;
}

export function CustomizeModeOnly({ children }: { children: ReactNode }) {
  return useOwnerCustomizeMode().isCustomizeMode ? <>{children}</> : null;
}

export function OwnerCustomizeContent({ hasPublicContent, children }: { hasPublicContent: boolean; children: ReactNode }) {
  const { isCustomizeMode } = useOwnerCustomizeMode();
  return hasPublicContent || isCustomizeMode ? <>{children}</> : null;
}
