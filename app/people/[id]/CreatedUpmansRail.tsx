"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "./person.module.css";

const rarityClassNames: Record<string, string> = {
  Common: styles.common,
  Rare: styles.rare,
  Epic: styles.epic,
  Mythic: styles.mythic,
  Legendary: styles.legendary,
};

type CreatedUpman = {
  slug: string;
  name: string;
  image: string;
  rarity: string;
};

const COLLAPSED_LIMIT = 4;

export default function CreatedUpmansRail({ upmans }: { upmans: CreatedUpman[] }) {
  const [expanded, setExpanded] = useState(false);
  const canToggle = upmans.length > COLLAPSED_LIMIT;
  const visibleUpmans = expanded ? upmans : upmans.slice(0, COLLAPSED_LIMIT);

  return (
    <section className={`${styles.section} ${styles.createdSection}`} aria-labelledby="created-heading">
      <h2 id="created-heading" className={styles.sectionHeading}>UPMANS CREATED</h2>
      <div id="created-upmans" className={styles.createdGrid}>
        {visibleUpmans.map((upman) => <CreatedUpmanCard key={upman.slug} upman={upman} />)}
      </div>
      {canToggle && (
        <button
          type="button"
          className={styles.createdToggle}
          aria-expanded={expanded}
          aria-controls="created-upmans"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Show less" : `Show all (${upmans.length})`}
        </button>
      )}
    </section>
  );
}

function CreatedUpmanCard({ upman }: { upman: CreatedUpman }) {
  return (
    <Link href={`/upmans/${upman.slug}`} className={`${styles.upmanCard} ${styles.createdCard} ${rarityClassNames[upman.rarity] ?? styles.common}`} aria-label={`View ${upman.name}, ${upman.rarity}`}>
      <span className={styles.cardArt}><Image src={upman.image} alt={upman.name} width={300} height={260} sizes="(max-width: 640px) 46vw, (max-width: 1040px) 30vw, 12rem" /></span>
      <span className={styles.cardInfo}><span>{upman.rarity}</span><strong>{upman.name}</strong></span>
    </Link>
  );
}
