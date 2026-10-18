"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import ui from "./GalleryControls.module.css";
import clouds from "./DexSkyControls.module.css";
import styles from "./CollectionGallery.module.css";
import { getUpmanRarityLabel, UP_MAN_RARITIES, type UpmanRarity } from "@/lib/upman-rarity";

const rarities = ["All", ...UP_MAN_RARITIES] as const;
const collectionViews = ["Collected", "Missing", "All"] as const;
type Rarity = UpmanRarity;
type CollectionView = (typeof collectionViews)[number];
const collectionRarities: Rarity[] = [...UP_MAN_RARITIES];

export type CollectionEntry = {
  slug: string;
  name: string;
  image: string;
  rarity: Rarity;
  creator: string;
  creatorTwitch: string | null;
  creatorAvatar: string | null;
  owned: boolean;
  canViewDetails?: boolean;
};

type Props = { upmans: CollectionEntry[]; ownedCount: number; viewerName?: string };

const rarityClassNames: Record<Rarity, string> = {
  Common: styles.common,
  Rare: styles.rare,
  Epic: styles.epic,
  Mythic: styles.mythic,
  Legendary: styles.legendary,
  Secret: "upman-secret",
  Event: "upman-event",
};

export default function CollectionGallery({ upmans, ownedCount, viewerName }: Props) {
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
  const missingCount = upmans.filter((upman) => !upman.owned).length;
  const viewCounts = { All: total, Collected: total - missingCount, Missing: missingCount };
  const completion = total > 0 ? Math.round((ownedCount / total) * 100) : 0;

  return (
    <>
      <section id="collection-progress" className={styles.progress} aria-label="Collection progress">
        <div className={styles.overall}>
          <p>{viewerName ? `${viewerName}’s little sky, growing` : "Your little sky, growing"}</p>
          <strong>{ownedCount} <span>/ {total}</span></strong>
          <span>Upmans collected · across every rarity</span>
        </div>
        <div className={styles.completion}>
          <strong>{completion}<span>%</span></strong>
          <span>of {viewerName ? "this" : "your"} collection complete</span>
          <div className={styles.track} role="progressbar" aria-label="Overall collection completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, completion)} aria-valuetext={`${ownedCount} of ${total} Upmans collected`}><i style={{ width: `${Math.min(100, completion)}%` }} /></div>
        </div>
        <div className={styles.nextStep}>
          <p>{total === 0 ? (viewerName ? "This cloud shelf is ready for new arrivals." : "Your cloud shelf is ready for new arrivals.") : missingCount === 0 ? (viewerName ? "Every Upman has found a place in this sky. What a collection!" : "Every Upman has found a place in your sky. What a collection!") : <><strong>{missingCount} more {missingCount === 1 ? "face" : "faces"} to discover.</strong> Every little cloud adds a new story.</>}</p>
          {missingCount > 0 && <a href="#collection-controls" onClick={() => { setView("Missing"); setRarity("All"); }}>See what’s missing <span aria-hidden="true">→</span></a>}
        </div>
      </section>

      <section className={styles.raritySection} aria-labelledby="rarity-progress-title">
        <div className={styles.breakdownHeading}><h2 id="rarity-progress-title">A little closer, rarity by rarity</h2><p>Collected / available in {viewerName ? "this" : "your"} collection</p></div>
        <div className={styles.rarityProgress}>
          {rarityProgress.map((item) => {
            const percentage = item.total > 0 ? (item.owned / item.total) * 100 : 0;
            return (
              <div key={item.rarity} className={`${styles.rarityItem} ${rarityClassNames[item.rarity]}`}>
                <div><span>{item.rarity}</span><strong>{item.owned} / {item.total}</strong></div>
                <i role="progressbar" aria-label={`${item.rarity} collection completion`} aria-valuemin={0} aria-valuemax={item.total || 1} aria-valuenow={item.owned} aria-valuetext={item.total ? `${item.owned} of ${item.total} collected` : "No Upmans available in this rarity"}><b style={{ width: `${percentage}%` }} /></i>
                <small>{item.total === 0 ? "No arrivals yet" : item.owned === item.total ? "All collected ✓" : `${item.total - item.owned} still to find`}</small>
              </div>
            );
          })}
        </div>
      </section>

      <section id="collection-controls" tabIndex={-1} className={`${ui.panel} ${styles.collectionControls}`} aria-label={viewerName ? "Browse this collection" : "Browse your collection"}>
        <div className={ui.panelHeading}><h2>{viewerName ? "Explore the collection" : "Your collection, your way"}</h2><p>{viewerName ? "Browse discoveries and the faces still missing from this sky." : "Revisit your discoveries or find the faces still missing from your sky."}</p></div>
        <fieldset className={ui.fieldset}>
          <legend>Show Upmans</legend>
          <div className={`${ui.segmented} ${styles.collectionViews}`}>
            {collectionViews.map((item) => (
              <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)}>{item}<small>{viewCounts[item]}</small></button>
            ))}
          </div>
        </fieldset>
        <fieldset className={ui.fieldset}>
          <legend>Rarity <span>Combine with the view above</span></legend>
          <div className={clouds.chips}>
            {rarities.map((item) => (
              <button key={item} type="button" aria-pressed={rarity === item} className={`${clouds.chip} ${clouds[item.toLowerCase()]}`} onClick={() => setRarity(item)}>{item}</button>
            ))}
          </div>
        </fieldset>
        <div className={ui.resultRow}>
          <p role="status" aria-live="polite" aria-atomic="true"><strong>{filtered.length}</strong> {view === "All" ? "Upmans" : `${view.toLowerCase()} Upman${filtered.length === 1 ? "" : "s"}`}{rarity !== "All" ? ` · ${rarity}` : " · all rarities"}</p>
          <button className={ui.reset} type="button" disabled={view === "Collected" && rarity === "All"} onClick={() => { setView("Collected"); setRarity("All"); }}>Reset filters</button>
        </div>
      </section>

      {filtered.length > 0 ? (
        <div className={styles.gallery}>
          {filtered.map((upman) => <CollectionEntryCard key={upman.slug} upman={upman} />)}
        </div>
      ) : view === "Collected" ? (
        <div className={styles.empty}><p>{ownedCount === 0 ? (viewerName ? "This explorer hasn’t collected an Upman yet." : "Your first little cloud is still out there. Let’s meet the Upmans.") : "No collected Upmans match this rarity yet."}</p><button type="button" onClick={() => { setView("Collected"); setRarity("All"); }}>Reset collection filters</button><Link href="/upmans">Explore the Upmandex <span aria-hidden="true">→</span></Link></div>
      ) : (
        <div className={styles.empty}><p>{view === "Missing" && missingCount === 0 && total > 0 ? "Nothing missing — every Upman has a place in your sky!" : "No Upmans match this view."}</p><button type="button" onClick={() => { setView("Collected"); setRarity("All"); }}>Reset collection filters</button></div>
      )}
    </>
  );
}

function CollectionEntryCard({ upman }: { upman: CollectionEntry }) {
  const className = `${styles.entry} ${rarityClassNames[upman.rarity]} ${upman.owned ? "" : styles.missing}`;
  const content = <>
    <div className={styles.artwork}><Image src={upman.image} alt={upman.name} width={320} height={300} sizes="(max-width: 620px) 45vw, (max-width: 900px) 30vw, 22vw" /></div>
    <div className={styles.info}>
      <span className={`${styles.rarity} ${upman.rarity === "Secret" ? "rarity-secret" : upman.rarity === "Event" ? "rarity-event" : ""}`}>{getUpmanRarityLabel(upman.rarity)}</span>
      <h2>{upman.name}</h2>
      <p>Created by <strong>{upman.creator}</strong></p>
      {upman.creatorTwitch && <p className={styles.creatorIdentity}>{upman.creatorAvatar && (
        // This URL is stored on the matching Twitch-authenticated User record.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={upman.creatorAvatar} alt="" />
      )}<span>@{upman.creatorTwitch}</span></p>}
      <span className={upman.owned ? styles.ownedLabel : styles.missingLabel}><span aria-hidden="true">{upman.owned ? "✓" : "🔒"}</span> {upman.owned ? "Owned" : "Not collected"}</span>
    </div>
  </>;

  return upman.canViewDetails === false
    ? <article className={className} aria-label={`${upman.name}, ${getUpmanRarityLabel(upman.rarity)}, collected by this explorer`}>{content}</article>
    : <Link href={`/upmans/${upman.slug}`} className={className} aria-label={`View ${upman.name}, ${getUpmanRarityLabel(upman.rarity)}${upman.owned ? ", collected" : ", missing"}`}>{content}</Link>;
}
