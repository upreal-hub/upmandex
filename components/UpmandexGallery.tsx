"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import ui from "./GalleryControls.module.css";
import styles from "./UpmandexGallery.module.css";
import { getUpmanRarityLabel, UP_MAN_RARITIES, type UpmanRarity } from "@/lib/upman-rarity";

const rarities = ["All", ...UP_MAN_RARITIES] as const;

export type UpmandexEntry = {
  slug: string;
  name: string;
  image: string;
  rarity: UpmanRarity;
  creator: string;
  creatorTwitch: string | null;
  creatorAvatar: string | null;
  owned: boolean;
};

type Props = {
  upmans: UpmandexEntry[];
  collection: { ownedCount: number; totalCount: number } | null;
  showConnectMessage: boolean;
};

const rarityClassNames: Record<UpmanRarity, string> = {
  Common: styles.common,
  Rare: styles.rare,
  Epic: styles.epic,
  Mythic: styles.mythic,
  Legendary: styles.legendary,
  Secret: styles.secret,
  Event: "upman-event",
};

export default function UpmandexGallery({ upmans, collection, showConnectMessage }: Props) {
  const [query, setQuery] = useState("");
  const [selectedRarity, setSelectedRarity] = useState<(typeof rarities)[number]>("All");

  const rarityCounts = useMemo(() => {
    return upmans.reduce<Record<(typeof rarities)[number], number>>(
      (counts, upman) => {
        counts.All += 1;
        counts[upman.rarity] += 1;
        return counts;
      },
      { All: 0, Common: 0, Rare: 0, Epic: 0, Mythic: 0, Legendary: 0, Secret: 0, Event: 0 },
    );
  }, [upmans]);

  const filteredUpmans = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return upmans.filter((upman) => {
      const matchesRarity = selectedRarity === "All" || upman.rarity === selectedRarity;
      const matchesQuery = !normalizedQuery || [
        upman.name,
        upman.slug,
        upman.creator,
        upman.creatorTwitch ?? "",
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));

      return matchesRarity && matchesQuery;
    });
  }, [query, selectedRarity, upmans]);

  return (
    <>
      <section className={ui.panel} aria-label="Explore the Upmandex">
        <div className={ui.panelHeading}><h2>Find your next favourite</h2><p>A name, a creator, a rarity — see where the clouds take you.</p></div>
        <label className={ui.searchLabel}>
          <span>Search the Dex</span>
          <span className={ui.searchField}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10" cy="10" r="6.5" /><path d="m15 15 5 5" /></svg>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Upman name or creator…" />
          </span>
        </label>
        <fieldset className={ui.fieldset}>
          <legend>Rarity <span>Choose one to narrow your search</span></legend>
          <div className={ui.chips}>
            {rarities.map((rarity) => (
              <button key={rarity} type="button" onClick={() => setSelectedRarity(rarity)}
                className={`${ui.chip} ${ui[rarity.toLowerCase()]}`} aria-pressed={rarity === selectedRarity}>
                <span>{rarity}</span><small>{rarityCounts[rarity]}</small>
              </button>
            ))}
          </div>
        </fieldset>
        <div className={ui.resultRow}>
          <p role="status" aria-live="polite" aria-atomic="true"><strong>{filteredUpmans.length}</strong> of {upmans.length} Upman{upmans.length === 1 ? "" : "s"}{query.trim() || selectedRarity !== "All" ? " match your filters" : " ready to discover"}</p>
          <button className={ui.reset} type="button" disabled={!query && selectedRarity === "All"} onClick={() => { setQuery(""); setSelectedRarity("All"); }}>Reset filters</button>
        </div>
      </section>

      {(collection || showConnectMessage) && (
        <aside className={styles.collectionContext}>
          {collection ? (
            <>
              <p><span aria-hidden="true">☁</span> Your Dex <strong>{collection.ownedCount} / {collection.totalCount}</strong></p>
              <Link href="/my-collection">View My Collection <span aria-hidden="true">→</span></Link>
            </>
          ) : (
            <p>Connect with Twitch to track your collection.</p>
          )}
        </aside>
      )}

      {filteredUpmans.length > 0 ? (
        <div className={styles.gallery}>
          {filteredUpmans.map((upman) => (
            <Link
              key={upman.slug}
              href={`/upmans/${upman.slug}`}
              className={`${styles.entry} ${rarityClassNames[upman.rarity]}`}
              aria-label={`View ${upman.name}, ${upman.rarity}`}
            >
              <div className={styles.artwork}>
                <Image src={upman.image} alt={upman.name} width={320} height={300} sizes="(max-width: 620px) 45vw, (max-width: 900px) 30vw, 22vw" />
              </div>
              <div className={styles.info}>
                <span className={`${styles.rarity} ${upman.rarity === "Secret" ? "rarity-secret" : upman.rarity === "Event" ? "rarity-event" : ""}`}>{getUpmanRarityLabel(upman.rarity)}</span>
                <h2>{upman.name}</h2>
                <p className={styles.creator}>Created by <strong>{upman.creator}</strong></p>
                {upman.creatorTwitch && (
                  <p className={styles.creatorIdentity}>
                    {upman.creatorAvatar && (
                      // The avatar URL comes from the stored Twitch-authenticated User record.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={upman.creatorAvatar} alt="" />
                    )}
                    <span>@{upman.creatorTwitch}</span>
                  </p>
                )}
                {upman.owned && <p className={styles.owned}><span aria-hidden="true">✓</span> Owned</p>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>No Upmans are drifting through these clouds.</p>
          <button type="button" onClick={() => { setQuery(""); setSelectedRarity("All"); }}>Clear filters</button>
        </div>
      )}
    </>
  );
}
