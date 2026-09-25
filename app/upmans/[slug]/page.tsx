import Image from "next/image";
import Link from "next/link";

import { auth } from "@/auth";
import UpmanDetailHotbar from "@/components/UpmanDetailHotbar";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";

import styles from "./upman-detail.module.css";

const rarityClassNames: Record<string, string> = {
  Common: styles.common,
  Rare: styles.rare,
  Epic: styles.epic,
  Mythic: styles.mythic,
  Legendary: styles.legendary,
};

const previewClassNames: Record<string, string> = {
  Common: styles.previewCommon,
  Rare: styles.previewRare,
  Epic: styles.previewEpic,
  Mythic: styles.previewMythic,
  Legendary: styles.previewLegendary,
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UpmanPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { slug } = await params;
  const { view } = await searchParams;
  const activeView = view === "creator" ? "CREATOR" : "UPMAN";
  const session = await auth();
  const twitchLogin = normalizeTwitchLogin(session?.user?.name);

  const upmans = await prisma.upman.findMany({
    orderBy: [{ name: "asc" }, { slug: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      image: true,
      rarity: true,
      creator: true,
      creatorTwitch: true,
    },
  });
  const currentIndex = upmans.findIndex((upman) => upman.slug === slug);
  const upman = currentIndex >= 0 ? upmans[currentIndex] : null;

  if (!upman) {
    return <LostUpman />;
  }

  const [viewer, creator] = await Promise.all([
    twitchLogin
      ? prisma.user.findUnique({
          where: { twitchLogin },
          select: { inventory: { where: { upmanId: upman.id }, select: { id: true } } },
        })
      : null,
    upman.creatorTwitch
      ? prisma.user.findUnique({
          where: { twitchLogin: upman.creatorTwitch },
          select: { avatar: true },
        })
      : null,
  ]);

  const creatorUpmans = upmans
    .filter((candidate) => candidate.creator === upman.creator && candidate.slug !== upman.slug)
    .slice(0, 4);
  const previousUpman = currentIndex > 0 ? upmans[currentIndex - 1] : null;
  const nextUpman = currentIndex < upmans.length - 1 ? upmans[currentIndex + 1] : null;
  const rarityClassName = rarityClassNames[upman.rarity] ?? styles.common;

  return (
    <main className={`upman-detail-page ${styles.page} ${rarityClassName}`}>
      <Link href="/upmans" className={styles.back}>
        <span aria-hidden="true">←</span> Back to Upmandex
      </Link>

      <section className={styles.hero} aria-labelledby="upman-name">
        <div className={styles.artworkStage}>
          <Image
            src={upman.image}
            alt={upman.name}
            className={styles.artwork}
            width={640}
            height={640}
            priority
            sizes="(max-width: 500px) 88vw, (max-width: 900px) 62vw, 32rem"
          />
        </div>
        <h1 id="upman-name" className={styles.name}>{upman.name}</h1>
        <span className={styles.rarity}>{upman.rarity}</span>
        <p className={styles.creator}>
          <span>Created by</span>
          <span>
            {creator?.avatar && (
              // This URL is stored on the matching Twitch-authenticated User record.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creator.avatar} alt="" />
            )}
            {upman.creator}
          </span>
        </p>
        <UpmanDetailHotbar
          active={activeView}
          upmanHref={`/upmans/${upman.slug}`}
          creatorHref={`/upmans/${upman.slug}?view=creator`}
        />
      </section>

      {activeView === "CREATOR" ? (
        <CreatorView
          creatorAvatar={creator?.avatar ?? null}
          creatorName={upman.creator}
          creatorTwitch={upman.creatorTwitch}
          currentSlug={upman.slug}
          currentName={upman.name}
          upmans={upmans.filter((candidate) => candidate.creator === upman.creator)}
        />
      ) : (
        <UpmanView
          creatorName={upman.creator}
          creatorUpmans={creatorUpmans}
          isOwned={Boolean(viewer?.inventory.length)}
          isSignedIn={Boolean(twitchLogin)}
          previousUpman={previousUpman}
          nextUpman={nextUpman}
        />
      )}
    </main>
  );
}

type DetailUpman = {
  slug: string;
  name: string;
  image: string;
  rarity: string;
};

function UpmanView({
  creatorName,
  creatorUpmans,
  isOwned,
  isSignedIn,
  previousUpman,
  nextUpman,
}: {
  creatorName: string;
  creatorUpmans: DetailUpman[];
  isOwned: boolean;
  isSignedIn: boolean;
  previousUpman: DetailUpman | null;
  nextUpman: DetailUpman | null;
}) {
  return (
    <div id="upman-view" className={styles.sections}>
      <section aria-labelledby="collection-heading">
        <h2 id="collection-heading" className={styles.sectionHeading}>IN YOUR COLLECTION</h2>
        <CollectionContext isSignedIn={isSignedIn} isOwned={isOwned} />
      </section>

      {creatorUpmans.length > 0 && (
        <section aria-labelledby="creator-heading">
          <h2 id="creator-heading" className={styles.sectionHeading}>MORE FROM {creatorName.toUpperCase()}</h2>
          <div className={styles.creatorPreview}>
            {creatorUpmans.map((other) => (
              <Link
                key={other.slug}
                href={`/upmans/${other.slug}`}
                className={`${styles.previewCard} ${previewClassNames[other.rarity] ?? styles.previewCommon}`}
              >
                <span className={styles.previewArt}>
                  <Image src={other.image} alt={other.name} width={160} height={150} sizes="(max-width: 760px) 42vw, 10rem" />
                </span>
                <strong>{other.name}</strong>
              </Link>
            ))}
          </div>
        </section>
      )}

      <nav className={styles.pager} aria-label="Browse Upmans">
        {previousUpman ? <PagerLink direction="previous" upman={previousUpman} /> : <span className={styles.pagerSpacer} />}
        {nextUpman ? <PagerLink direction="next" upman={nextUpman} /> : <span className={styles.pagerSpacer} />}
      </nav>
    </div>
  );
}

function CreatorView({
  creatorAvatar,
  creatorName,
  creatorTwitch,
  currentSlug,
  currentName,
  upmans,
}: {
  creatorAvatar: string | null;
  creatorName: string;
  creatorTwitch: string | null;
  currentSlug: string;
  currentName: string;
  upmans: DetailUpman[];
}) {
  return (
    <div id="creator-view" className={`${styles.sections} ${styles.creatorSections}`}>
      <section className={styles.creatorIdentitySection} aria-labelledby="creator-identity-heading">
        <p className={styles.creatorEyebrow}>CREATOR</p>
        <div className={styles.creatorIdentityBody}>
          {creatorAvatar && (
            // This avatar is stored on the matching Twitch-authenticated User record.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creatorAvatar} alt={`${creatorName} on Twitch`} className={styles.creatorAvatar} />
          )}
          <div>
            <h2 id="creator-identity-heading" className={styles.creatorName}>{creatorName}</h2>
            {creatorTwitch && <p className={styles.creatorHandle}>@{creatorTwitch}</p>}
            <p className={styles.creatorContext}>Creator of {currentName}</p>
            <p className={styles.creatorCount}>{upmans.length} Upman{upmans.length === 1 ? "" : "s"} in the UPMANDEX</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="creator-upmans-heading">
        <h2 id="creator-upmans-heading" className={styles.sectionHeading}>UPMANS BY {creatorName.toUpperCase()}</h2>
        <div className={styles.creatorGallery}>
          {upmans.map((creatorUpman) => {
            const isCurrent = creatorUpman.slug === currentSlug;
            return (
              <Link
                key={creatorUpman.slug}
                href={`/upmans/${creatorUpman.slug}`}
                className={`${styles.creatorCard} ${previewClassNames[creatorUpman.rarity] ?? styles.previewCommon}`}
                aria-label={`View ${creatorUpman.name}, ${creatorUpman.rarity}${isCurrent ? ", current Upman" : ""}`}
              >
                {isCurrent && <span className={styles.currentLabel}>Current Upman</span>}
                <span className={styles.creatorCardArt}>
                  <Image src={creatorUpman.image} alt={creatorUpman.name} width={260} height={230} sizes="(max-width: 620px) 42vw, (max-width: 1000px) 26vw, 13rem" />
                </span>
                <span className={styles.creatorCardInfo}>
                  <span>{creatorUpman.rarity}</span>
                  <strong>{creatorUpman.name}</strong>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CollectionContext({ isSignedIn, isOwned }: { isSignedIn: boolean; isOwned: boolean }) {
  if (!isSignedIn) {
    return (
      <div className={styles.collectionContext}>
        <span className={styles.collectionMark} aria-hidden="true">☁</span>
        <div className={styles.collectionCopy}>
          <strong>Connect with Twitch</strong>
          <p>Connect with Twitch to see whether this Upman is in your collection.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.collectionContext}>
      <span className={styles.collectionMark} aria-hidden="true">{isOwned ? "✓" : "☁"}</span>
      <div className={styles.collectionCopy}>
        <strong>{isOwned ? "Collected" : "Not collected yet"}</strong>
        <p>{isOwned ? "This Upman is part of your collection." : "Keep exploring the clouds to find this Upman."}</p>
        {isOwned && <Link href="/my-collection">View My Collection <span aria-hidden="true">→</span></Link>}
      </div>
    </div>
  );
}

function PagerLink({ direction, upman }: { direction: "previous" | "next"; upman: { slug: string; name: string } }) {
  const isPrevious = direction === "previous";
  return (
    <Link href={`/upmans/${upman.slug}`} className={styles.pagerLink}>
      <small>{isPrevious ? "← Previous Upman" : "Next Upman →"}</small>
      <strong>{upman.name}</strong>
    </Link>
  );
}

function LostUpman() {
  return (
    <main className={`upman-detail-page ${styles.page}`}>
      <section className={styles.lost}>
        <p>Lost in the cloud world</p>
        <h1>This Upman could not be found.</h1>
        <Link href="/upmans" className={styles.back}>← Back to Upmandex</Link>
      </section>
    </main>
  );
}
