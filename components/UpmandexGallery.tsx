"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import styles from "./UpmandexGallery.module.css";

const rarities = ["All", "Common", "Rare", "Epic", "Mythic", "Legendary"] as const;

type Rarity = Exclude<(typeof rarities)[number], "All">;

export type UpmandexEntry = {
  slug: string;
  name: string;
  image: string;
  rarity: Rarity;
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

const rarityClassNames: Record<Rarity, string> = {
  Common: styles.common,
  Rare: styles.rare,
  Epic: styles.epic,
  Mythic: styles.mythic,
  Legendary: styles.legendary,
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
      { All: 0, Common: 0, Rare: 0, Epic: 0, Mythic: 0, Legendary: 0 },
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
      <div className={styles.controls}>
        <label className={styles.searchLabel}>
          <span className="sr-only">Search the Upmandex</span>
          <span aria-hidden="true" className={styles.searchIcon}>⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search an Upman or creator..."
            className={styles.searchInput}
          />
        </label>

        <div className={styles.filters} aria-label="Filter Upmans by rarity">
          {rarities.map((rarity) => {
            const isSelected = rarity === selectedRarity;
            return (
              <button
                key={rarity}
                type="button"
                onClick={() => setSelectedRarity(rarity)}
                className={`${styles.filter} ${rarity === "All" ? styles.all : rarityClassNames[rarity]} ${isSelected ? styles.selected : ""}`}
                aria-pressed={isSelected}
              >
                <span>{rarity === "All" ? "All" : rarity}</span>
                <small>{rarityCounts[rarity]}</small>
              </button>
            );
          })}
        </div>
      </div>

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

      <p className={styles.results} aria-live="polite">
        {filteredUpmans.length === upmans.length
          ? `${upmans.length} Upman${upmans.length === 1 ? "" : "s"} in the Dex`
          : `${filteredUpmans.length} matching Upman${filteredUpmans.length === 1 ? "" : "s"}`}
      </p>

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
                <span className={styles.rarity}>{upman.rarity}</span>
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
