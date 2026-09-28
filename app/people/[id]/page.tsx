import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAchievementCosmetic, getAchievementProgress } from "@/lib/achievements";
import { auth } from "@/auth";
import { normalizeTwitchLogin } from "@/lib/validation";

import AchievementsPanel from "./AchievementsPanel";
import AchievementCustomization from "./AchievementCustomization";
import CreatedUpmansRail from "./CreatedUpmansRail";
import PersonArtPreview from "./PersonArtPreview";
import PersonProjects from "./PersonProjects";
import PersonLinks from "./PersonLinks";
import PersonHeroLinks from "./PersonHeroLinks";
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
      equippedCustomBackgroundId: true,
      equippedCustomBannerId: true,
      featuredAchievementKeys: true,
      equippedCustomBackground: { select: { id: true, type: true, name: true, image: true } },
      equippedCustomBanner: { select: { id: true, type: true, name: true, image: true } },
      user: { select: { avatar: true, twitchLogin: true } },
      artworks: {
        take: 4,
        orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { id: true, image: true, title: true },
      },
      projects: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { id: true, title: true, description: true },
      },
      links: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { id: true, platform: true, url: true },
      },
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

  if (!person) notFound();

  const [achievementProgress, customAssets] = await Promise.all([
    getAchievementProgress(id),
    prisma.profileCosmeticAsset.findMany({
      select: { id: true, type: true, name: true, image: true },
      orderBy: [{ type: "asc" }, { name: "asc" }, { id: "asc" }],
    }),
  ]);
  const sessionLogin = normalizeTwitchLogin((await auth())?.user?.name);
  const currentUser = sessionLogin ? await prisma.user.findUnique({ where: { twitchLogin: sessionLogin }, select: { id: true } }) : null;
  const isOwner = Boolean(currentUser && person.userId === currentUser.id);
  if (!person.isPublic && !isOwner) notFound();
  const unlockedAchievements = achievementProgress?.families.flatMap((family) => family.milestones.map((milestone) => ({ key: milestone.key, family: family.key, name: family.name, label: milestone.label, category: family.category, unlocked: milestone.isUnlocked, trackable: milestone.trackable, current: milestone.displayCurrent, target: milestone.displayTarget, cosmetic: {
    title: getAchievementCosmetic(milestone.key, "title"),
    background: getAchievementCosmetic(milestone.key, "background"),
    banner: getAchievementCosmetic(milestone.key, "banner"),
    accent: getAchievementCosmetic(milestone.key, "accent"),
  } }))) ?? [];
  const title = unlockedAchievements.find((achievement) => achievement.key === person.equippedTitleAchievementKey && achievement.unlocked) ?? null;
  const featured = person.featuredAchievementKeys.map((key) => unlockedAchievements.find((achievement) => achievement.key === key && achievement.unlocked)).filter((achievement): achievement is (typeof unlockedAchievements)[number] => Boolean(achievement));
  const customBackground = person.equippedCustomBackground;
  const customBanner = person.equippedCustomBanner;
  const background = customBackground ? null : person.equippedBackgroundAchievementKey ? getAchievementCosmetic(person.equippedBackgroundAchievementKey, "background") : null;
  const banner = customBanner ? null : person.equippedBannerAchievementKey ? getAchievementCosmetic(person.equippedBannerAchievementKey, "banner") : null;
  const accent = person.equippedAccentAchievementKey ? getAchievementCosmetic(person.equippedAccentAchievementKey, "accent") : null;

  const hasRepresented = person.representedUpmans.length > 0;
  const hasCreated = person.createdUpmans.length > 0;

  return (
    <main className={`person-page ${styles.page}`} data-background={customBackground ? "custom" : background?.styleKey ?? "default"} data-accent={accent?.styleKey ?? "default"}>
      {customBackground && <div className={styles.customProfileBackground} aria-hidden="true"><Image src={customBackground.image} alt="" fill sizes="(max-width: 760px) 100vw, 75rem" className={styles.customProfileImage} /></div>}
      <div className={styles.profileScene} aria-hidden="true" />
      <section className={styles.header} data-banner={customBanner ? "custom" : banner?.styleKey ?? "default"} aria-labelledby="person-name">
        {customBanner
          ? <div className={styles.customProfileBanner} aria-hidden="true"><Image src={customBanner.image} alt="" fill sizes="(max-width: 760px) 100vw, 75rem" className={styles.customProfileImage} /></div>
          : <div className={styles.headerBanner} aria-hidden="true" />}
        {person.user?.avatar && <PersonAvatar src={person.user.avatar} displayName={person.displayName} />}
        <div className={styles.headerCopy}>
          <h1 id="person-name" className={styles.name}>{person.displayName}</h1>
          {title && <p className={styles.equippedTitle} data-category={title.category}>✓ {title.cosmetic.title?.label ?? title.name} <span>· {title.name} {title.label}</span></p>}
          {person.user?.twitchLogin && <TwitchIdentity login={person.user.twitchLogin} />}
        </div>
        <div className={styles.heroAside}>
          <PersonHeroLinks personName={person.displayName} links={person.links} />
          {isOwner && <div className={styles.ownerActions}>
            <AchievementCustomization personId={person.id} achievements={unlockedAchievements} customAssets={customAssets} identity={{ displayName: person.displayName, avatar: person.user?.avatar ?? null, twitchLogin: person.user?.twitchLogin ?? null }} loadout={{ equippedTitleAchievementKey: person.equippedTitleAchievementKey, equippedBackgroundAchievementKey: person.equippedBackgroundAchievementKey, equippedBannerAchievementKey: person.equippedBannerAchievementKey, equippedAccentAchievementKey: person.equippedAccentAchievementKey, equippedCustomBackgroundId: person.equippedCustomBackgroundId, equippedCustomBannerId: person.equippedCustomBannerId }} featuredAchievementKeys={featured.map((achievement) => achievement.key)} />
            <PersonLinks personId={person.id} personName={person.displayName} links={person.links} isOwner={isOwner} />
          </div>}
        </div>
      </section>

      {achievementProgress && <AchievementsPanel progress={achievementProgress} personId={person.id} isOwner={isOwner} achievements={unlockedAchievements} featuredAchievements={featured} identity={{ displayName: person.displayName, avatar: person.user?.avatar ?? null, twitchLogin: person.user?.twitchLogin ?? null }} loadout={{ equippedTitleAchievementKey: person.equippedTitleAchievementKey, equippedBackgroundAchievementKey: person.equippedBackgroundAchievementKey, equippedBannerAchievementKey: person.equippedBannerAchievementKey, equippedAccentAchievementKey: person.equippedAccentAchievementKey, equippedCustomBackgroundId: person.equippedCustomBackgroundId, equippedCustomBannerId: person.equippedCustomBannerId }} showCustomization={false} />}

      {(person.artworks.length || person.projects.length || isOwner) && <section className={styles.creativeSpace} aria-labelledby="creative-space-heading">
        <header className={styles.zoneHeading}><h2 id="creative-space-heading">Creative space</h2></header>
        <div className={styles.creativeGrid}>
          <PersonArtPreview personId={person.id} personName={person.displayName} artworks={person.artworks} isOwner={isOwner} />
          <PersonProjects personId={person.id} projects={person.projects} isOwner={isOwner} />
        </div>
      </section>}

      {hasRepresented && <UpmanSection title="MY UPMAN" upmans={person.representedUpmans} />}
      {hasCreated && <CreatedUpmansRail upmans={person.createdUpmans} />}
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
    <div className={styles.representedFeature}><UpmanCard upman={upmans[0]} /></div>
    {upmans.length > 1 && <div className={styles.representedMore}>{upmans.slice(1).map((upman) => <UpmanCard key={upman.slug} upman={upman} />)}</div>}
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
