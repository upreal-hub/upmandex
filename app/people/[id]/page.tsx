import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAchievementCosmetic, getAchievementProgress } from "@/lib/achievements";
import { auth } from "@/auth";
import { normalizeTwitchLogin } from "@/lib/validation";

import AchievementsPanel from "./AchievementsPanel";
import CreatedUpmansRail from "./CreatedUpmansRail";
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
      id: true,
      userId: true,
      displayName: true,
      isPublic: true,
      equippedTitleAchievementKey: true,
      equippedBackgroundAchievementKey: true,
      equippedBannerAchievementKey: true,
      equippedAccentAchievementKey: true,
      featuredAchievementKeys: true,
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

  const achievementProgress = await getAchievementProgress(id);
  const sessionLogin = normalizeTwitchLogin((await auth())?.user?.name);
  const currentUser = sessionLogin ? await prisma.user.findUnique({ where: { twitchLogin: sessionLogin }, select: { id: true } }) : null;
  const isOwner = Boolean(currentUser && person.userId === currentUser.id);
  const unlockedAchievements = achievementProgress?.families.flatMap((family) => family.milestones.map((milestone) => ({ key: milestone.key, family: family.key, name: family.name, label: milestone.label, category: family.category, unlocked: milestone.isUnlocked, trackable: milestone.trackable, cosmetic: {
    title: getAchievementCosmetic(milestone.key, "title"),
    background: getAchievementCosmetic(milestone.key, "background"),
    banner: getAchievementCosmetic(milestone.key, "banner"),
    accent: getAchievementCosmetic(milestone.key, "accent"),
  } }))) ?? [];
  const title = unlockedAchievements.find((achievement) => achievement.key === person.equippedTitleAchievementKey && achievement.unlocked) ?? null;
  const featured = person.featuredAchievementKeys.map((key) => unlockedAchievements.find((achievement) => achievement.key === key && achievement.unlocked)).filter((achievement): achievement is (typeof unlockedAchievements)[number] => Boolean(achievement));
  const background = person.equippedBackgroundAchievementKey ? getAchievementCosmetic(person.equippedBackgroundAchievementKey, "background") : null;
  const banner = person.equippedBannerAchievementKey ? getAchievementCosmetic(person.equippedBannerAchievementKey, "banner") : null;
  const accent = person.equippedAccentAchievementKey ? getAchievementCosmetic(person.equippedAccentAchievementKey, "accent") : null;

  const hasRepresented = person.representedUpmans.length > 0;
  const hasCreated = person.createdUpmans.length > 0;

  return (
    <main className={`person-page ${styles.page}`} data-background={background?.styleKey ?? "default"} data-accent={accent?.styleKey ?? "default"}>
      <section className={styles.header} data-banner={banner?.styleKey ?? "default"} aria-labelledby="person-name">
        {person.user?.avatar && <PersonAvatar src={person.user.avatar} displayName={person.displayName} />}
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>PERSON</p>
          <h1 id="person-name" className={styles.name}>{person.displayName}</h1>
          {title && <p className={styles.equippedTitle} data-category={title.category}>✓ {title.cosmetic.title?.label ?? title.name} <span>· {title.name} {title.label}</span></p>}
          {person.user?.twitchLogin && <TwitchIdentity login={person.user.twitchLogin} />}
        </div>
      </section>

      {achievementProgress && <AchievementsPanel progress={achievementProgress} personId={person.id} isOwner={isOwner} achievements={unlockedAchievements} featuredAchievements={featured} loadout={{ equippedTitleAchievementKey: person.equippedTitleAchievementKey, equippedBackgroundAchievementKey: person.equippedBackgroundAchievementKey, equippedBannerAchievementKey: person.equippedBannerAchievementKey, equippedAccentAchievementKey: person.equippedAccentAchievementKey }} />}

      {(hasRepresented || hasCreated) && (
        <div className={`${styles.sections} ${hasRepresented && hasCreated ? styles.sectionsBoth : styles.sectionsSingle}`}>
          {hasRepresented && <UpmanSection title="REPRESENTED IN UPMANDEX BY" upmans={person.representedUpmans} />}
          {hasCreated && <CreatedUpmansRail upmans={person.createdUpmans} />}
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

function UpmanSection({ title, upmans }: { title: string; upmans: PersonUpman[] }) {
  return <section className={`${styles.section} ${styles.representedSection}`} aria-labelledby="represented-heading">
    <h2 id="represented-heading" className={styles.sectionHeading}>{title}</h2>
    <div className={styles.representedGrid}>
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
