"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./person.module.css";

type CosmeticPreview = { label: string; styleKey: string } | null;
export type DisplayAchievement = {
  key: string; family: string; name: string; label: string; category: string; unlocked: boolean; trackable: boolean;
  cosmetic: { title: CosmeticPreview; background: CosmeticPreview; banner: CosmeticPreview; accent: CosmeticPreview };
};
type Loadout = { equippedTitleAchievementKey: string | null; equippedBackgroundAchievementKey: string | null; equippedBannerAchievementKey: string | null; equippedAccentAchievementKey: string | null };
const slots = [["Title", "equippedTitleAchievementKey", "title"], ["Background", "equippedBackgroundAchievementKey", "background"], ["Banner", "equippedBannerAchievementKey", "banner"], ["Accent", "equippedAccentAchievementKey", "accent"]] as const;

export default function AchievementCustomization({ personId, achievements, loadout, featuredAchievementKeys }: { personId: string; achievements: DisplayAchievement[]; loadout: Loadout; featuredAchievementKeys: string[] }) {
  const router = useRouter(); const [open, setOpen] = useState(false); const [currentLoadout, setCurrentLoadout] = useState<Loadout>(loadout); const [featured, setFeatured] = useState(featuredAchievementKeys); const [savedFeatured, setSavedFeatured] = useState(featuredAchievementKeys); const [error, setError] = useState<string | null>(null); const [success, setSuccess] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const visibleAchievements = useMemo(() => achievements.filter((achievement) => achievement.unlocked || achievement.trackable), [achievements]);
  const unlockedAchievements = useMemo(() => achievements.filter((achievement) => achievement.unlocked), [achievements]);
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => event.key === "Escape" && !saving && setOpen(false); window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [open, saving]);
  function toggleFeatured(key: string) { setFeatured((current) => current.includes(key) ? current.filter((item) => item !== key) : current.length < 3 ? [...current, key] : current); }
  async function persist(nextLoadout: Loadout, nextFeatured: string[], message: string) {
    setSaving(true); setError(null); setSuccess(null);
    try {
      const response = await fetch(`/api/people/${personId}/achievements`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...nextLoadout, featuredAchievementKeys: nextFeatured }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) { setError(data?.error ?? "Unable to save your choices"); return false; }
      setCurrentLoadout(nextLoadout); setSuccess(message); router.refresh(); return true;
    } catch {
      setError("Unable to save your choices");
      return false;
    } finally {
      setSaving(false);
    }
  }
  async function equip(slot: keyof Loadout, key: string | null) {
    const nextLoadout = { ...currentLoadout, [slot]: key };
    await persist(nextLoadout, savedFeatured, key ? "Cosmetic equipped." : "Cosmetic reset to Anniversary Default.");
  }
  async function saveFeatured() { if (await persist(currentLoadout, featured, "Featured achievements saved.")) setSavedFeatured(featured); }
  const labelFor = (slot: keyof Loadout) => { const achievement = achievements.find((item) => item.key === currentLoadout[slot]); const cosmeticSlot = slots.find(([, property]) => property === slot)?.[2]; if (!achievement || !cosmeticSlot) return "Anniversary Default"; const cosmetic = achievement.cosmetic[cosmeticSlot]; return cosmetic ? `${cosmetic.label} · ${achievement.name} ${achievement.label}` : "Anniversary Default"; };
  return <><button type="button" className={styles.customizeButton} onClick={() => { setCurrentLoadout(loadout); setFeatured(featuredAchievementKeys); setSavedFeatured(featuredAchievementKeys); setError(null); setSuccess(null); setOpen(true); }}>Customize profile</button>{open && createPortal(<div className={styles.customizationOverlay} onMouseDown={(event) => event.target === event.currentTarget && !saving && setOpen(false)}><section className={styles.customizationDialog} role="dialog" aria-modal="true" aria-labelledby="customize-achievements-title"><header><div><p className={styles.eyebrow}>YOUR PROFILE</p><h2 id="customize-achievements-title">Achievement cosmetics</h2><p>Every unlocked achievement grants a complete bundle. Equip each slot independently.</p></div><button type="button" onClick={() => setOpen(false)} disabled={saving}>Close</button></header><section className={styles.loadoutSummary} aria-label="Current cosmetic loadout">{slots.map(([label, property]) => <div key={property}><strong>{label}</strong><span>{labelFor(property)}</span><button type="button" onClick={() => equip(property, null)} disabled={saving || currentLoadout[property] === null}>Use default</button></div>)}</section><section className={styles.cosmeticBundles} aria-labelledby="bundle-rewards-heading"><h3 id="bundle-rewards-heading">Achievement bundles</h3>{visibleAchievements.map((achievement) => <article key={achievement.key} className={styles.cosmeticBundle} data-locked={!achievement.unlocked}><header><div><strong>{achievement.name} · {achievement.label}</strong><span>{achievement.unlocked ? "Unlocked" : "Locked"}</span></div><small>{achievement.unlocked ? "Choose any reward below." : "Unlock this achievement to equip its rewards."}</small></header><div className={styles.bundleRewards}>{slots.map(([label, property, cosmeticSlot]) => { const cosmetic = achievement.cosmetic[cosmeticSlot]; return <div key={property} data-style={cosmetic?.styleKey}><span>{label}</span><strong>{cosmetic?.label}</strong><button type="button" disabled={!achievement.unlocked || saving || currentLoadout[property] === achievement.key} onClick={() => equip(property, achievement.key)}>{currentLoadout[property] === achievement.key ? "Equipped" : `Equip ${label}`}</button></div>; })}</div></article>)}</section><fieldset><legend>Featured achievements <span>{featured.length}/3</span></legend>{unlockedAchievements.map((item) => <label key={item.key}><input type="checkbox" checked={featured.includes(item.key)} disabled={saving || (!featured.includes(item.key) && featured.length >= 3)} onChange={() => toggleFeatured(item.key)} /> ✓ {item.name} · {item.label}</label>)}</fieldset>{error && <p className={styles.customizationError} role="alert">{error}</p>}{success && <p className={styles.customizationSuccess} role="status">{success}</p>}<footer><button type="button" onClick={() => setOpen(false)} disabled={saving}>Cancel</button><button type="button" onClick={saveFeatured} disabled={saving}>{saving ? "Saving…" : "Save featured"}</button></footer></section></div>, document.body)}</>;
}
