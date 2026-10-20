"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import ui from "./DexSkyControls.module.css";
import styles from "./UpmandexGallery.module.css";
import { getUpmanRarityLabel, UP_MAN_RARITIES, type UpmanRarity } from "@/lib/upman-rarity";

const rarities = ["All", ...UP_MAN_RARITIES] as const;
type OwnershipFilter = "all" | "owned" | "missing";

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
  const [selectedRarities, setSelectedRarities] = useState<UpmanRarity[]>([]);
  const [ownership, setOwnership] = useState<OwnershipFilter>("all");

  function toggleRarity(rarity: (typeof rarities)[number]) {
    setSelectedRarities((current) => rarity === "All" ? [] : current.includes(rarity)
      ? current.filter((item) => item !== rarity)
      : [...current, rarity]);
  }

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
      const matchesRarity = selectedRarities.length === 0 || selectedRarities.includes(upman.rarity);
      const matchesQuery = !normalizedQuery || [
        upman.name,
        upman.slug,
        upman.creator,
        upman.creatorTwitch ?? "",
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
      const matchesOwnership = !collection || ownership === "all" || (ownership === "owned" ? upman.owned : !upman.owned);

      return matchesRarity && matchesQuery && matchesOwnership;
    });
  }, [collection, ownership, query, selectedRarities, upmans]);

  return (
    <>
      <section className={ui.panel} aria-label="Explore the Upmandex">
        <div className={ui.panelHeading}><p>Follow your curiosity</p><h2>Which clouds will you explore?</h2></div>
        <label className={ui.searchLabel}>
          <span>Search the Dex</span>
          <span className={ui.searchField}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10" cy="10" r="6.5" /><path d="m15 15 5 5" /></svg>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="An Upman, a creator, a little curiosity…" />
          </span>
        </label>
        <fieldset className={ui.fieldset}>
          <legend>Choose your rarity clouds <span>Pick one or several. Tap again to let one drift away.</span></legend>
          <div className={ui.chips}>
            {rarities.map((rarity) => {
              const isSelected = rarity === "All" ? selectedRarities.length === 0 : selectedRarities.includes(rarity);
              return (
                <button key={rarity} type="button" onClick={() => toggleRarity(rarity)}
                  className={`${ui.chip} ${ui[rarity.toLowerCase()]}`} aria-pressed={isSelected}>
                  <span className={ui.selection} aria-hidden="true">{isSelected ? "✓" : "+"}</span>
                  <span>{rarity}</span><small>{rarityCounts[rarity]}</small>
                </button>
              );
            })}
          </div>
        </fieldset>
        {collection && <fieldset className={ui.fieldset}>
          <legend>Choose your collection view <span>These clouds use your real collection, without changing the Dex itself.</span></legend>
          <div className={`${ui.chips} ${ui.ownershipChips}`}>
            {([
              ["all", "All Upmans", upmans.length],
              ["owned", "Collected", collection.ownedCount],
              ["missing", "Not collected", Math.max(0, collection.totalCount - collection.ownedCount)],
            ] as const).map(([value, label, count]) => <button key={value} type="button" className={`${ui.chip} ${ui.ownershipChip}`} aria-pressed={ownership === value} onClick={() => setOwnership(value)}>
              <span className={ui.selection} aria-hidden="true">{ownership === value ? "✓" : "+"}</span><span>{label}</span><small>{count}</small>
            </button>)}
          </div>
        </fieldset>}
        <div className={ui.resultRow}>
          <p role="status" aria-live="polite" aria-atomic="true"><strong>{filteredUpmans.length}</strong> of {upmans.length} Upman{upmans.length === 1 ? "" : "s"}{query.trim() || selectedRarities.length > 0 ? " match your sky" : " ready to discover"}</p>
          <span className={ui.activeClouds}>{selectedRarities.length ? selectedRarities.join(" + ") : "All rarities · the whole sky"}{collection && ownership !== "all" ? ` · ${ownership === "owned" ? "Collected" : "Not collected"}` : ""}</span>
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
              className={`${styles.entry} ${rarityClassNames[upman.rarity]} ${collection && !upman.owned ? styles.missing : ""}`}
              aria-label={`View ${upman.name}, ${upman.rarity}${collection ? upman.owned ? ", owned" : ", not collected" : ""}`}
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
                {collection && !upman.owned && <p className={styles.missingLabel}>Not collected</p>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>No Upmans are drifting through these clouds.</p>
          <p>Try another name, choose a different cloud, or pick All to explore every rarity.</p>
        </div>
      )}
    </>
  );
}
