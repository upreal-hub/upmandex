import Link from "next/link";

import { prisma } from "@/lib/prisma";

import styles from "./art.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ArtPage() {
  const artworks = await prisma.personArtwork.findMany({
    where: { person: { is: { isPublic: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      image: true,
      title: true,
      person: {
        select: {
          id: true,
          displayName: true,
          user: { select: { twitchLogin: true } },
        },
      },
    },
  });

  const artistCount = new Set(artworks.map((artwork) => artwork.person.id)).size;

  return (
    <main className={styles.artPage}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>CREATIVE SPACE</p>
        <h1>ART FROM THE CLOUD WORLD</h1>
        <p>
          A small, growing gallery of work shared by the people of UPMANDEX.
        </p>
        {artworks.length > 0 && (
          <span className={styles.count}>
            {artworks.length} artwork{artworks.length === 1 ? "" : "s"} · {artistCount} artist{artistCount === 1 ? "" : "s"}
          </span>
        )}
      </header>

      {artworks.length > 0 ? (
        <section className={styles.gallery} aria-label="Community artwork gallery">
          {artworks.map((artwork) => {
            const artworkName = artwork.title ?? "Untitled artwork";
            const artistName = artwork.person.displayName;
            const galleryHref = `/people/${artwork.person.id}/art`;
            const personHref = `/people/${artwork.person.id}`;

            return (
              <article key={artwork.id} className={styles.artwork}>
                <Link
                  href={galleryHref}
                  className={styles.artworkImage}
                  aria-label={`View ${artistName}'s full art gallery`}
                >
                  {/* Public artwork preserves its natural dimensions in the art wall. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={artwork.image}
                    alt={`${artworkName} by ${artistName}`}
                    loading="lazy"
                    decoding="async"
                  />
                </Link>
                <div className={styles.artworkCaption}>
                  <div>
                    <p>{artwork.title ?? "Untitled artwork"}</p>
                    <Link href={personHref} className={styles.artistLink}>
                      {artistName}
                      {artwork.person.user?.twitchLogin && <small>@{artwork.person.user.twitchLogin}</small>}
                    </Link>
                  </div>
                  <Link href={galleryHref} className={styles.galleryLink}>
                    Gallery <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className={styles.empty}>
          <span aria-hidden="true">☁</span>
          <h2>The gallery is waiting for its first piece.</h2>
          <p>When a public Person shares artwork, it will appear here for the whole cloud world to explore.</p>
          <Link href="/people">Meet the people of UPMANDEX <span aria-hidden="true">→</span></Link>
        </section>
      )}
    </main>
  );
}
