"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import styles from "./CollectionGallery.module.css";

const rarities = ["All", "Common", "Rare", "Epic", "Mythic", "Legendary"] as const;
const collectionViews = ["Collected", "Missing", "All"] as const;
type Rarity = Exclude<(typeof rarities)[number], "All">;
type CollectionView = (typeof collectionViews)[number];
const collectionRarities: Rarity[] = ["Common", "Rare", "Epic", "Mythic", "Legendary"];

export type CollectionEntry = {
  slug: string;
  name: string;
  image: string;
  rarity: Rarity;
  creator: string;
  creatorTwitch: string | null;
  creatorAvatar: string | null;
  owned: boolean;
};

type Props = { upmans: CollectionEntry[]; ownedCount: number };

const rarityClassNames: Record<Rarity, string> = {
  Common: styles.common,
  Rare: styles.rare,
  Epic: styles.epic,
  Mythic: styles.mythic,
  Legendary: styles.legendary,
};

export default function CollectionGallery({ upmans, ownedCount }: Props) {
  const [view, setView] = useState<CollectionView>("Collected");
  const [rarity, setRarity] = useState<(typeof rarities)[number]>("All");

  const rarityProgress = useMemo(() => collectionRarities.map((item) => ({
    rarity: item,
    total: upmans.filter((upman) => upman.rarity === item).length,
    owned: upmans.filter((upman) => upman.rarity === item && upman.owned).length,
  })), [upmans]);

  const filtered = useMemo(() => upmans.filter((upman) => {
    const matchesView = view === "All" || (view === "Collected" ? upman.owned : !upman.owned);
    return matchesView && (rarity === "All" || upman.rarity === rarity);
  }), [rarity, upmans, view]);

  const total = upmans.length;
  const completion = total > 0 ? Math.round((ownedCount / total) * 100) : 0;

  return (
    <>
      <section className={styles.progress} aria-label="Collection progress">
        <div className={styles.overall}>
          <p>Your cloud shelf</p>
          <strong>{ownedCount} <span>/ {total}</span></strong>
          <span>Upmans collected</span>
        </div>
        <div className={styles.completion}>
          <strong>{completion}%</strong>
          <span>complete</span>
          <div className={styles.track} aria-label={`${completion}% complete`}><i style={{ width: `${completion}%` }} /></div>
        </div>
      </section>

      <section className={styles.rarityProgress} aria-label="Rarity progress">
        {rarityProgress.map((item) => {
          const percentage = item.total > 0 ? (item.owned / item.total) * 100 : 0;
          return (
            <div key={item.rarity} className={`${styles.rarityItem} ${rarityClassNames[item.rarity]}`}>
              <div><span>{item.rarity}</span><strong>{item.owned} / {item.total}</strong></div>
              <i><b style={{ width: `${percentage}%` }} /></i>
            </div>
          );
        })}
      </section>

      <div className={styles.controls}>
        <div className={styles.viewControls} aria-label="Collection view">
          {collectionViews.map((item) => (
            <button key={item} type="button" aria-pressed={view === item} className={`${styles.viewButton} ${view === item ? styles.selected : ""}`} onClick={() => setView(item)}>{item}</button>
          ))}
        </div>
        <div className={styles.rarityControls} aria-label="Filter collection by rarity">
          {rarities.map((item) => (
            <button key={item} type="button" aria-pressed={rarity === item} className={`${styles.rarityButton} ${item === "All" ? styles.all : rarityClassNames[item]} ${rarity === item ? styles.selected : ""}`} onClick={() => setRarity(item)}>{item}</button>
          ))}
        </div>
      </div>

      <p className={styles.results} aria-live="polite">{filtered.length} {view.toLowerCase()} Upman{filtered.length === 1 ? "" : "s"}</p>

      {filtered.length > 0 ? (
        <div className={styles.gallery}>
          {filtered.map((upman) => (
            <Link key={upman.slug} href={`/upmans/${upman.slug}`} className={`${styles.entry} ${rarityClassNames[upman.rarity]} ${upman.owned ? "" : styles.missing}`} aria-label={`View ${upman.name}, ${upman.rarity}${upman.owned ? ", collected" : ", missing"}`}>
              <div className={styles.artwork}><Image src={upman.image} alt={upman.name} width={320} height={300} sizes="(max-width: 620px) 45vw, (max-width: 900px) 30vw, 22vw" /></div>
              <div className={styles.info}>
                <span className={styles.rarity}>{upman.rarity}</span>
                <h2>{upman.name}</h2>
                <p>Created by <strong>{upman.creator}</strong></p>
                {upman.creatorTwitch && <p className={styles.creatorIdentity}>{upman.creatorAvatar && (
                  // This URL is stored on the matching Twitch-authenticated User record.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={upman.creatorAvatar} alt="" />
                )}<span>@{upman.creatorTwitch}</span></p>}
                {!upman.owned && <span className={styles.missingLabel}>Missing</span>}
              </div>
            </Link>
          ))}
        </div>
      ) : view === "Collected" ? (
        <div className={styles.empty}><p>Your collection is waiting for its first Upman.</p><Link href="/upmans">Explore the Upmandex <span aria-hidden="true">→</span></Link></div>
      ) : (
        <div className={styles.empty}><p>No Upmans match this view.</p><button type="button" onClick={() => { setView("Collected"); setRarity("All"); }}>Reset collection filters</button></div>
      )}
    </>
  );
}
