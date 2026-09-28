"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./person.module.css";

type CosmeticSlot = "title" | "background" | "banner" | "accent";
type CosmeticPreview = { label: string; styleKey: string } | null;

export type DisplayAchievement = {
  key: string;
  family: string;
  name: string;
  label: string;
  category: string;
  unlocked: boolean;
  trackable: boolean;
  current: number;
  target: number;
  cosmetic: Record<CosmeticSlot, CosmeticPreview>;
};

type Loadout = {
  equippedTitleAchievementKey: string | null;
  equippedBackgroundAchievementKey: string | null;
  equippedBannerAchievementKey: string | null;
  equippedAccentAchievementKey: string | null;
  equippedCustomBackgroundId: string | null;
  equippedCustomBannerId: string | null;
};

type LoadoutKey = keyof Loadout;
type CustomAsset = { id: string; type: "BACKGROUND" | "BANNER"; name: string; image: string };
type SlotConfig = { slot: CosmeticSlot; label: string; property: LoadoutKey; customProperty?: LoadoutKey };

const slots: SlotConfig[] = [
  { slot: "title", label: "Title", property: "equippedTitleAchievementKey" },
  { slot: "background", label: "Background", property: "equippedBackgroundAchievementKey", customProperty: "equippedCustomBackgroundId" },
  { slot: "banner", label: "Banner", property: "equippedBannerAchievementKey", customProperty: "equippedCustomBannerId" },
  { slot: "accent", label: "Accent", property: "equippedAccentAchievementKey" },
];

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "UP";
}

export default function AchievementCustomization({
  personId,
  achievements,
  customAssets = [],
  identity,
  loadout,
  featuredAchievementKeys,
}: {
  personId: string;
  achievements: DisplayAchievement[];
  customAssets?: CustomAsset[];
  identity: { displayName: string; avatar: string | null; twitchLogin: string | null };
  loadout: Loadout;
  featuredAchievementKeys: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<CosmeticSlot>("background");
  const [equippedLoadout, setEquippedLoadout] = useState<Loadout>(loadout);
  const [previewLoadout, setPreviewLoadout] = useState<Loadout>(loadout);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const unlockedAchievements = useMemo(() => achievements.filter((achievement) => achievement.unlocked), [achievements]);
  const lockedAchievements = useMemo(() => achievements.filter((achievement) => !achievement.unlocked), [achievements]);
  const activeConfig = slots.find((item) => item.slot === activeSlot)!;
  const activeProperty = activeConfig.property;
  const activeCustomProperty = activeConfig.customProperty;
  const activeCustomAssets = useMemo(() => {
    if (!activeCustomProperty) return [];
    const type = activeSlot === "background" ? "BACKGROUND" : "BANNER";
    return customAssets.filter((asset) => asset.type === type);
  }, [activeCustomProperty, activeSlot, customAssets]);

  const options = useMemo(() => {
    if (activeSlot !== "accent") return unlockedAchievements;
    const byStyle = new Map<string, DisplayAchievement>();
    for (const achievement of unlockedAchievements) {
      const styleKey = achievement.cosmetic.accent?.styleKey;
      if (!styleKey) continue;
      const existing = byStyle.get(styleKey);
      if (!existing || achievement.key.localeCompare(existing.key) < 0) byStyle.set(styleKey, achievement);
    }
    return [...byStyle.values()];
  }, [activeSlot, unlockedAchievements]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open, saving]);

  function openCustomizer() {
    setActiveSlot("background");
    setEquippedLoadout(loadout);
    setPreviewLoadout(loadout);
    setError(null);
    setSuccess(null);
    setOpen(true);
  }

  function achievementFor(key: string | null) {
    return key ? achievements.find((achievement) => achievement.key === key) ?? null : null;
  }

  function cosmeticFor(slot: CosmeticSlot, key: string | null) {
    return achievementFor(key)?.cosmetic[slot] ?? null;
  }

  function previewSelection(key: string | null) {
    if (activeSlot !== "accent" || !key) return key;
    const selectedStyle = cosmeticFor("accent", key)?.styleKey;
    const equippedKey = equippedLoadout.equippedAccentAchievementKey;
    if (selectedStyle && cosmeticFor("accent", equippedKey)?.styleKey === selectedStyle) return equippedKey;
    return key;
  }

  function previewOption(key: string | null) {
    setPreviewLoadout((current) => ({ ...current, [activeProperty]: previewSelection(key), ...(activeCustomProperty ? { [activeCustomProperty]: null } : {}) }));
    setError(null);
    setSuccess(null);
  }

  function previewCustomOption(assetId: string) {
    if (!activeCustomProperty) return;
    setPreviewLoadout((current) => ({ ...current, [activeProperty]: null, [activeCustomProperty]: assetId }));
    setError(null);
    setSuccess(null);
  }

  async function equipPreview() {
    const nextLoadout: Loadout = {
      ...equippedLoadout,
      [activeProperty]: previewLoadout[activeProperty],
      ...(activeCustomProperty ? { [activeCustomProperty]: previewLoadout[activeCustomProperty] } : {}),
    };
    const selectionChanged = nextLoadout[activeProperty] !== equippedLoadout[activeProperty]
      || Boolean(activeCustomProperty && nextLoadout[activeCustomProperty] !== equippedLoadout[activeCustomProperty]);
    if (!selectionChanged) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/people/${personId}/achievements`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nextLoadout, featuredAchievementKeys }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Unable to equip this cosmetic");
        setPreviewLoadout(equippedLoadout);
        return;
      }
      setEquippedLoadout(nextLoadout);
      setPreviewLoadout(nextLoadout);
      setSuccess(`${activeConfig.label} equipped.`);
      router.refresh();
    } catch {
      setError("Unable to equip this cosmetic");
      setPreviewLoadout(equippedLoadout);
    } finally {
      setSaving(false);
    }
  }

  const previewTitle = cosmeticFor("title", previewLoadout.equippedTitleAchievementKey);
  const previewBackground = cosmeticFor("background", previewLoadout.equippedBackgroundAchievementKey);
  const previewBanner = cosmeticFor("banner", previewLoadout.equippedBannerAchievementKey);
  const previewAccent = cosmeticFor("accent", previewLoadout.equippedAccentAchievementKey);
  const previewCustomBackground = customAssets.find((asset) => asset.id === previewLoadout.equippedCustomBackgroundId && asset.type === "BACKGROUND") ?? null;
  const previewCustomBanner = customAssets.find((asset) => asset.id === previewLoadout.equippedCustomBannerId && asset.type === "BANNER") ?? null;
  const isPreviewDifferent = previewLoadout[activeProperty] !== equippedLoadout[activeProperty]
    || Boolean(activeCustomProperty && previewLoadout[activeCustomProperty] !== equippedLoadout[activeCustomProperty]);

  return <>
    <button type="button" className={styles.customizeButton} onClick={openCustomizer}>Customize profile</button>
    {open && createPortal(
      <div className={styles.customizationOverlay} onMouseDown={(event) => event.target === event.currentTarget && !saving && setOpen(false)}>
        <section className={styles.customizationDialog} role="dialog" aria-modal="true" aria-labelledby="customize-profile-title">
          <header className={styles.customizerHeader}>
            <div><p className={styles.eyebrow}>YOUR PROFILE</p><h2 id="customize-profile-title">Customize profile</h2><p>Preview rewards freely. Equip only what you want to keep.</p></div>
            <button type="button" onClick={() => setOpen(false)} disabled={saving} aria-label="Close profile customizer">Close</button>
          </header>

          <div className={`${styles.customizerPreview} ${styles.page}`} data-background={previewCustomBackground ? "custom" : previewBackground?.styleKey ?? "default"} data-accent={previewAccent?.styleKey ?? "default"} aria-label="Live profile preview">
            {previewCustomBackground && <span className={styles.customPreviewBackground} aria-hidden="true"><Image src={previewCustomBackground.image} alt="" fill sizes="34rem" className={styles.customProfileImage} /></span>}
            <div className={styles.profileScene} aria-hidden="true" />
            <section className={`${styles.header} ${styles.customizerPreviewHeader}`} data-banner={previewCustomBanner ? "custom" : previewBanner?.styleKey ?? "default"}>
              {previewCustomBanner
                ? <span className={styles.customPreviewBanner} aria-hidden="true"><Image src={previewCustomBanner.image} alt="" fill sizes="34rem" className={styles.customProfileImage} /></span>
                : <div className={styles.headerBanner} aria-hidden="true" />}
              {identity.avatar
                // This is the linked Twitch avatar URL already used by the public Person header.
                // eslint-disable-next-line @next/next/no-img-element
                ? <img className={styles.avatar} src={identity.avatar} alt="" />
                : <span className={`${styles.avatar} ${styles.previewAvatarFallback}`} aria-hidden="true">{initials(identity.displayName)}</span>}
              <div className={styles.headerCopy}><p className={styles.eyebrow}>LIVE PREVIEW</p><strong className={styles.previewName}>{identity.displayName}</strong>{previewTitle && <p className={styles.equippedTitle}>✓ {previewTitle.label}</p>}{identity.twitchLogin && <p className={styles.previewTwitch}>@{identity.twitchLogin}</p>}</div>
            </section>
          </div>

          <div className={styles.slotTabs} role="tablist" aria-label="Cosmetic slots">
            {slots.map((item) => <button key={item.slot} type="button" role="tab" aria-selected={activeSlot === item.slot} onClick={() => { setActiveSlot(item.slot); setError(null); setSuccess(null); }}>{item.label}</button>)}
          </div>

          <section className={styles.slotGallery} aria-labelledby="cosmetic-gallery-title">
            <div className={styles.galleryHeading}><div><p className={styles.eyebrow}>CHOOSE A REWARD</p><h3 id="cosmetic-gallery-title">{activeConfig.label}</h3></div><span>{options.length} unlocked</span></div>
            {(activeSlot === "background" || activeSlot === "banner") && <p className={styles.sourceHeading}>Achievement {activeConfig.label.toLowerCase()}s</p>}
            <div className={`${styles.galleryOptions} ${styles[`gallery${activeConfig.label}`]}`}>
              <CosmeticOption slot={activeSlot} achievement={null} selected={previewLoadout[activeProperty] === null} equipped={equippedLoadout[activeProperty] === null} onPreview={() => previewOption(null)} />
              {options.map((achievement) => {
                const cosmetic = achievement.cosmetic[activeSlot];
                const optionKey = previewSelection(achievement.key);
                const selected = previewLoadout[activeProperty] === optionKey;
                const equipped = activeSlot === "accent"
                  ? cosmetic?.styleKey === cosmeticFor("accent", equippedLoadout.equippedAccentAchievementKey)?.styleKey
                  : equippedLoadout[activeProperty] === achievement.key;
                return cosmetic ? <CosmeticOption key={achievement.key} slot={activeSlot} achievement={achievement} selected={selected} equipped={Boolean(equipped)} onPreview={() => previewOption(achievement.key)} /> : null;
              })}
            </div>
            {activeCustomProperty && <>
              <p className={styles.sourceHeading}>Custom {activeConfig.label.toLowerCase()}s</p>
              {activeCustomAssets.length
                ? <div className={`${styles.galleryOptions} ${styles.customAssetOptions}`}>
                  {activeCustomAssets.map((asset) => <CustomCosmeticOption key={asset.id} slot={activeSlot as "background" | "banner"} asset={asset} selected={previewLoadout[activeCustomProperty] === asset.id} equipped={equippedLoadout[activeCustomProperty] === asset.id} onPreview={() => previewCustomOption(asset.id)} />)}
                </div>
                : <p className={styles.noCustomAssets}>No custom {activeConfig.label.toLowerCase()}s are available yet.</p>}
            </>}
          </section>

          <div className={styles.customizerActions}><p>{isPreviewDifferent ? `Previewing a new ${activeConfig.label.toLowerCase()}.` : "This selection is currently equipped."}</p><button type="button" onClick={equipPreview} disabled={saving || !isPreviewDifferent}>{saving ? "Equipping…" : `Equip ${activeConfig.label}`}</button></div>
          {error && <p className={styles.customizationError} role="alert">{error}</p>}
          {success && <p className={styles.customizationSuccess} role="status">{success}</p>}

          <details className={styles.lockedRewards}><summary>More to discover <span>{lockedAchievements.length}</span></summary><div>{lockedAchievements.map((achievement) => <article key={achievement.key}><strong>{achievement.name} · {achievement.label}</strong><span>{achievement.trackable ? `${achievement.current} / ${achievement.target}` : "Tracking coming later"}</span><small>{achievement.cosmetic[activeSlot]?.label}</small></article>)}</div></details>
        </section>
      </div>, document.body,
    )}
  </>;
}

function CustomCosmeticOption({ slot, asset, selected, equipped, onPreview }: { slot: "background" | "banner"; asset: CustomAsset; selected: boolean; equipped: boolean; onPreview: () => void }) {
  return <button type="button" className={`${styles.cosmeticOption} ${styles.customCosmeticOption}`} data-slot={slot} data-selected={selected} data-equipped={equipped} onClick={onPreview} aria-pressed={selected}>
    <span className={styles.customOptionMedia}><Image src={asset.image} alt="" fill sizes="(max-width: 430px) 100vw, 14rem" className={styles.customProfileImage} /></span>
    <span className={styles.optionCopy}><strong>{asset.name}</strong><small>Custom {slot}</small><em>{equipped ? "Equipped" : selected ? "Previewing" : "Preview"}</em></span>
  </button>;
}

function CosmeticOption({ slot, achievement, selected, equipped, onPreview }: { slot: CosmeticSlot; achievement: DisplayAchievement | null; selected: boolean; equipped: boolean; onPreview: () => void }) {
  const cosmetic = achievement?.cosmetic[slot] ?? null;
  const label = cosmetic?.label ?? "Anniversary Default";
  const source = achievement ? `${achievement.name} · ${achievement.label}` : "No achievement cosmetic";
  const styleKey = cosmetic?.styleKey ?? "default";

  return <button type="button" className={styles.cosmeticOption} data-slot={slot} data-selected={selected} data-equipped={equipped} data-style={styleKey} onClick={onPreview} aria-pressed={selected}>
    {slot === "background" && <span className={`${styles.optionScene} ${styles.page}`} data-background={styleKey}><span className={styles.profileScene} aria-hidden="true" /></span>}
    {slot === "banner" && <span className={`${styles.optionBanner} ${styles.header}`} data-banner={styleKey}><span className={styles.headerBanner} aria-hidden="true" /></span>}
    {slot === "accent" && <span className={styles.optionAccent} data-accent={styleKey} aria-hidden="true" />}
    <span className={styles.optionCopy}><strong>{label}</strong><small>{source}</small><em>{equipped ? "Equipped" : selected ? "Previewing" : "Preview"}</em></span>
  </button>;
}
