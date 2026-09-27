import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import styles from "./person.module.css";

const rarityClassNames: Record<string, string> = {
  Common: styles.common,
  Rare: styles.rare,
  Epic: styles.epic,
  Mythic: styles.mythic,
  Legendary: styles.legendary,
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PersonUpman = {
  slug: string;
  name: string;
  image: string;
  rarity: string;
};

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await prisma.person.findUnique({
    where: { id },
    select: {
      displayName: true,
      isPublic: true,
      user: { select: { avatar: true, twitchLogin: true } },
      representedUpmans: {
        orderBy: [{ name: "asc" }, { slug: "asc" }],
        select: { slug: true, name: true, image: true, rarity: true },
      },
      createdUpmans: {
        orderBy: [{ name: "asc" }, { slug: "asc" }],
        select: { slug: true, name: true, image: true, rarity: true },
      },
    },
  });

  if (!person?.isPublic) notFound();

  const hasRepresented = person.representedUpmans.length > 0;
  const hasCreated = person.createdUpmans.length > 0;

  return (
    <main className={`person-page ${styles.page}`}>
      <section className={styles.header} aria-labelledby="person-name">
        {person.user?.avatar && <PersonAvatar src={person.user.avatar} displayName={person.displayName} />}
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>PERSON</p>
          <h1 id="person-name" className={styles.name}>{person.displayName}</h1>
          {person.user?.twitchLogin && <TwitchIdentity login={person.user.twitchLogin} />}
        </div>
      </section>

      {(hasRepresented || hasCreated) && (
        <div className={`${styles.sections} ${hasRepresented && hasCreated ? styles.sectionsBoth : styles.sectionsSingle}`}>
          {hasRepresented && <UpmanSection title="REPRESENTED IN UPMANDEX BY" upmans={person.representedUpmans} kind="represented" />}
          {hasCreated && <UpmanSection title="UPMANS CREATED" upmans={person.createdUpmans} kind="created" />}
        </div>
      )}
    </main>
  );
}

function PersonAvatar({ src, displayName }: { src: string; displayName: string }) {
  // This avatar is stored on the Person's linked Twitch-authenticated User record.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={`${displayName} on Twitch`} className={styles.avatar} />;
}

function TwitchIdentity({ login }: { login: string }) {
  return <p className={styles.twitchIdentity}>
    <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false"><path d="M3 0 0 7v21h7v6l6-6h5l10-10V0H3Zm22 17-6 6h-6l-5 5v-5H3V3h22v14ZM19 7h-3v8h3V7Zm-8 0H8v8h3V7Z" /></svg>
    <span>@{login}</span>
  </p>;
}

function UpmanSection({ title, upmans, kind }: { title: string; upmans: PersonUpman[]; kind: "represented" | "created" }) {
  return <section className={`${styles.section} ${kind === "represented" ? styles.representedSection : styles.createdSection}`} aria-labelledby={`${kind}-heading`}>
    <h2 id={`${kind}-heading`} className={styles.sectionHeading}>{title}</h2>
    <div className={kind === "represented" ? styles.representedGrid : styles.createdGrid}>
      {upmans.map((upman) => <UpmanCard key={upman.slug} upman={upman} />)}
    </div>
  </section>;
}

function UpmanCard({ upman }: { upman: PersonUpman }) {
  return (
    <Link href={`/upmans/${upman.slug}`} className={`${styles.upmanCard} ${rarityClassNames[upman.rarity] ?? styles.common}`} aria-label={`View ${upman.name}, ${upman.rarity}`}>
      <span className={styles.cardArt}><Image src={upman.image} alt={upman.name} width={300} height={260} sizes="(max-width: 640px) 46vw, (max-width: 1040px) 30vw, 17rem" /></span>
      <span className={styles.cardInfo}><span>{upman.rarity}</span><strong>{upman.name}</strong></span>
    </Link>
  );
}
