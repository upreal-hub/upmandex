"use client";

import Image from "next/image";
import Link from "next/link";

import { useOwnerCustomizeMode } from "./OwnerCustomizeMode";
import styles from "./person-art.module.css";

type Artwork = { id: string; image: string; title: string | null };

export default function PersonArtPreview({ personId, personName, artworks, isOwner }: { personId: string; personName: string; artworks: Artwork[]; isOwner: boolean }) {
  const { isCustomizeMode } = useOwnerCustomizeMode();
  const canManage = isOwner && isCustomizeMode;
  if (!artworks.length && !canManage) return null;

  return (
    <section className={styles.preview} aria-labelledby="person-art-heading">
      <div className={styles.sectionHeading}>
        <div><h2 id="person-art-heading">ART</h2></div>
        {canManage ? <Link href={`/people/${personId}/art`}>Manage art <span aria-hidden="true">→</span></Link> : artworks.length > 0 && <Link href={`/people/${personId}/art`}>View all art <span aria-hidden="true">→</span></Link>}
      </div>
      {artworks.length ? (
        <div className={styles.previewGrid}>
          {artworks.map((artwork) => (
            <Link key={artwork.id} href={`/people/${personId}/art`} className={styles.previewCard}>
              <span className={styles.previewImage}><Image src={artwork.image} alt={artwork.title ? `${artwork.title} by ${personName}` : `Artwork by ${personName}`} fill sizes="(max-width: 600px) 44vw, 13rem" /></span>
              {artwork.title && <strong>{artwork.title}</strong>}
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.emptyPreview}>
          <p>Your gallery is ready for its first artwork.</p>
          <Link href={`/people/${personId}/art`}>Open my art gallery</Link>
        </div>
      )}
    </section>
  );
}
