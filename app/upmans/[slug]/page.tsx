import Image from "next/image";
import Link from "next/link";

import { auth } from "@/auth";
import UpmanDetailHotbar from "@/components/UpmanDetailHotbar";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";

import styles from "./upman-detail.module.css";

const rarityClassNames: Record<string, string> = { Common: styles.common, Rare: styles.rare, Epic: styles.epic, Mythic: styles.mythic, Legendary: styles.legendary };
const previewClassNames: Record<string, string> = { Common: styles.previewCommon, Rare: styles.previewRare, Epic: styles.previewEpic, Mythic: styles.previewMythic, Legendary: styles.previewLegendary };

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PublicIdentity = { displayName: string; avatar: string | null; twitchLogin: string | null };
type DetailUpman = {
  id: string; slug: string; name: string; image: string; rarity: string; creator: string; creatorTwitch: string | null;
  creatorPersonId: string | null; representedPersonId: string | null;
  creatorPerson: { id: string; displayName: string; isPublic: boolean; user: { avatar: string | null; twitchLogin: string } | null } | null;
  representedPerson: { id: string; displayName: string; isPublic: boolean; user: { avatar: string | null; twitchLogin: string } | null } | null;
};

export default async function UpmanPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ view?: string | string[] }> }) {
  const { slug } = await params;
  const { view } = await searchParams;
  const session = await auth();
  const twitchLogin = normalizeTwitchLogin(session?.user?.name);
  const upmans: DetailUpman[] = await prisma.upman.findMany({
    orderBy: [{ name: "asc" }, { slug: "asc" }],
    select: {
      id: true, slug: true, name: true, image: true, rarity: true, creator: true, creatorTwitch: true, creatorPersonId: true, representedPersonId: true,
      creatorPerson: { select: { id: true, displayName: true, isPublic: true, user: { select: { avatar: true, twitchLogin: true } } } },
      representedPerson: { select: { id: true, displayName: true, isPublic: true, user: { select: { avatar: true, twitchLogin: true } } } },
    },
  });
  const currentIndex = upmans.findIndex((candidate) => candidate.slug === slug);
  const upman = currentIndex >= 0 ? upmans[currentIndex] : null;
  if (!upman) return <LostUpman />;

  const structuredCreator = upman.creatorPerson?.isPublic ? upman.creatorPerson : null;
  const representedPerson = upman.representedPerson?.isPublic ? upman.representedPerson : null;
  const [viewer, legacyCreator] = await Promise.all([
    twitchLogin ? prisma.user.findUnique({ where: { twitchLogin }, select: { inventory: { where: { upmanId: upman.id }, select: { id: true } } } }) : null,
    !structuredCreator && upman.creatorTwitch ? prisma.user.findUnique({ where: { twitchLogin: upman.creatorTwitch }, select: { avatar: true } }) : null,
  ]);
  const creatorIdentity: PublicIdentity = structuredCreator
    ? { displayName: structuredCreator.displayName, avatar: structuredCreator.user?.avatar ?? null, twitchLogin: structuredCreator.user?.twitchLogin ?? null }
    : { displayName: upman.creator, avatar: legacyCreator?.avatar ?? null, twitchLogin: upman.creatorTwitch };
  const creatorUpmans = structuredCreator ? upmans.filter((candidate) => candidate.creatorPersonId === structuredCreator.id) : upmans.filter((candidate) => candidate.creator === upman.creator);
  const representedUpmans = representedPerson ? upmans.filter((candidate) => candidate.representedPersonId === representedPerson.id) : [];
  const hasPersonView = Boolean(representedPerson);
  const activeView = view === "creator" ? "CREATOR" : view === "person" && hasPersonView ? "PERSON" : "UPMAN";
  const previousUpman = currentIndex > 0 ? upmans[currentIndex - 1] : null;
  const nextUpman = currentIndex < upmans.length - 1 ? upmans[currentIndex + 1] : null;

  return <main className={`upman-detail-page ${styles.page} ${rarityClassNames[upman.rarity] ?? styles.common}`}>
    <Link href="/upmans" className={styles.back}><span aria-hidden="true">←</span> Back to Upmandex</Link>
    <section className={styles.hero} aria-labelledby="upman-name">
      <div className={styles.artworkStage}><Image src={upman.image} alt={upman.name} className={styles.artwork} width={640} height={640} priority sizes="(max-width: 500px) 88vw, (max-width: 900px) 62vw, 32rem" /></div>
      <h1 id="upman-name" className={styles.name}>{upman.name}</h1><span className={styles.rarity}>{upman.rarity}</span>
      <p className={styles.creator}><span>Created by</span><span>{creatorIdentity.avatar && <Avatar src={creatorIdentity.avatar} />} {creatorIdentity.displayName}</span></p>
      <UpmanDetailHotbar active={activeView} upmanHref={`/upmans/${upman.slug}`} creatorHref={`/upmans/${upman.slug}?view=creator`} personHref={hasPersonView ? `/upmans/${upman.slug}?view=person` : undefined} />
    </section>
    {activeView === "CREATOR" ? <CreatorView identity={creatorIdentity} currentSlug={upman.slug} currentName={upman.name} upmans={creatorUpmans} /> : activeView === "PERSON" && representedPerson ? <PersonView identity={{ displayName: representedPerson.displayName, avatar: representedPerson.user?.avatar ?? null, twitchLogin: representedPerson.user?.twitchLogin ?? null }} currentSlug={upman.slug} upmans={representedUpmans} /> : <UpmanView creatorName={creatorIdentity.displayName} creatorUpmans={creatorUpmans.filter((candidate) => candidate.slug !== upman.slug).slice(0, 4)} isOwned={Boolean(viewer?.inventory.length)} isSignedIn={Boolean(twitchLogin)} previousUpman={previousUpman} nextUpman={nextUpman} />}
  </main>;
}

function Avatar({ src, className }: { src: string; className?: string }) {
  // The avatar is stored on an existing Twitch-authenticated User record.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} />;
}
function TwitchIdentity({ login }: { login: string }) { return <p className={styles.creatorHandle}><svg viewBox="0 0 28 28" aria-hidden="true" focusable="false"><path d="M3 0 0 7v21h7v6l6-6h5l10-10V0H3Zm22 17-6 6h-6l-5 5v-5H3V3h22v14ZM19 7h-3v8h3V7Zm-8 0H8v8h3V7Z" /></svg><span>@{login}</span></p>; }

function UpmanView({ creatorName, creatorUpmans, isOwned, isSignedIn, previousUpman, nextUpman }: { creatorName: string; creatorUpmans: DetailUpman[]; isOwned: boolean; isSignedIn: boolean; previousUpman: DetailUpman | null; nextUpman: DetailUpman | null }) {
  return <div id="upman-view" className={styles.sections}>
    <section aria-labelledby="collection-heading"><h2 id="collection-heading" className={styles.sectionHeading}>IN YOUR COLLECTION</h2><CollectionContext isSignedIn={isSignedIn} isOwned={isOwned} /></section>
    {creatorUpmans.length > 0 && <section aria-labelledby="creator-heading"><h2 id="creator-heading" className={styles.sectionHeading}>MORE FROM {creatorName.toUpperCase()}</h2><div className={styles.creatorPreview}>{creatorUpmans.map((other) => <UpmanPreviewCard key={other.slug} upman={other} />)}</div></section>}
    <nav className={styles.pager} aria-label="Browse Upmans">{previousUpman ? <PagerLink direction="previous" upman={previousUpman} /> : <span className={styles.pagerSpacer} />}{nextUpman ? <PagerLink direction="next" upman={nextUpman} /> : <span className={styles.pagerSpacer} />}</nav>
  </div>;
}

function CreatorView({ identity, currentSlug, currentName, upmans }: { identity: PublicIdentity; currentSlug: string; currentName: string; upmans: DetailUpman[] }) {
  return <div id="creator-view" className={`${styles.sections} ${styles.creatorSections}`}><section className={styles.creatorIdentitySection} aria-labelledby="creator-identity-heading"><p className={styles.creatorEyebrow}>CREATOR</p><div className={styles.creatorIdentityBody}>{identity.avatar && <Avatar src={identity.avatar} className={styles.creatorAvatar} />}<div><h2 id="creator-identity-heading" className={styles.creatorName}>{identity.displayName}</h2>{identity.twitchLogin && <TwitchIdentity login={identity.twitchLogin} />}<p className={styles.creatorContext}>Creator of {currentName}</p><p className={styles.creatorCount}>{upmans.length} Upman{upmans.length === 1 ? "" : "s"} in the UPMANDEX</p></div></div></section><section aria-labelledby="creator-upmans-heading"><h2 id="creator-upmans-heading" className={styles.sectionHeading}>UPMANS BY {identity.displayName.toUpperCase()}</h2><div className={styles.creatorGallery}>{upmans.map((creatorUpman) => <CreatorCard key={creatorUpman.slug} upman={creatorUpman} isCurrent={creatorUpman.slug === currentSlug} />)}</div></section></div>;
}

function PersonView({ identity, currentSlug, upmans }: { identity: PublicIdentity; currentSlug: string; upmans: DetailUpman[] }) {
  const currentUpman = upmans.find((candidate) => candidate.slug === currentSlug);
  const otherUpmans = upmans.filter((candidate) => candidate.slug !== currentSlug);
  return <div id="person-view" className={`${styles.sections} ${styles.personSections}`}><section className={styles.personIdentitySection} aria-labelledby="person-identity-heading"><p className={styles.creatorEyebrow}>THE PERSON BEHIND THIS UPMAN</p><div className={styles.creatorIdentityBody}>{identity.avatar && <Avatar src={identity.avatar} className={styles.personAvatar} />}<div><h2 id="person-identity-heading" className={styles.creatorName}>{identity.displayName}</h2>{identity.twitchLogin && <TwitchIdentity login={identity.twitchLogin} />}</div></div></section><section aria-labelledby="represented-heading"><h2 id="represented-heading" className={styles.sectionHeading}>REPRESENTED IN UPMANDEX BY</h2><div className={styles.representedUpmans}>{currentUpman && <CreatorCard upman={currentUpman} isCurrent />}</div>{otherUpmans.length > 0 && <p className={styles.representedMore}>Also represented by {otherUpmans.slice(0, 3).map((candidate) => candidate.name).join(", ")}{otherUpmans.length > 3 ? ` and ${otherUpmans.length - 3} more` : ""}.</p>}</section></div>;
}

function CreatorCard({ upman, isCurrent }: { upman: DetailUpman; isCurrent: boolean }) { return <Link href={`/upmans/${upman.slug}`} className={`${styles.creatorCard} ${previewClassNames[upman.rarity] ?? styles.previewCommon}`} aria-label={`View ${upman.name}, ${upman.rarity}${isCurrent ? ", current Upman" : ""}`}>{isCurrent && <span className={styles.currentLabel}>Current Upman</span>}<span className={styles.creatorCardArt}><Image src={upman.image} alt={upman.name} width={260} height={230} sizes="(max-width: 620px) 42vw, (max-width: 1000px) 26vw, 13rem" /></span><span className={styles.creatorCardInfo}><span>{upman.rarity}</span><strong>{upman.name}</strong></span></Link>; }
function UpmanPreviewCard({ upman }: { upman: DetailUpman }) { return <Link href={`/upmans/${upman.slug}`} className={`${styles.previewCard} ${previewClassNames[upman.rarity] ?? styles.previewCommon}`}><span className={styles.previewArt}><Image src={upman.image} alt={upman.name} width={160} height={150} sizes="(max-width: 760px) 42vw, 10rem" /></span><strong>{upman.name}</strong></Link>; }
function CollectionContext({ isSignedIn, isOwned }: { isSignedIn: boolean; isOwned: boolean }) { if (!isSignedIn) return <div className={styles.collectionContext}><span className={styles.collectionMark} aria-hidden="true">☁</span><div className={styles.collectionCopy}><strong>Connect with Twitch</strong><p>Connect with Twitch to see whether this Upman is in your collection.</p></div></div>; return <div className={styles.collectionContext}><span className={styles.collectionMark} aria-hidden="true">{isOwned ? "✓" : "☁"}</span><div className={styles.collectionCopy}><strong>{isOwned ? "Collected" : "Not collected yet"}</strong><p>{isOwned ? "This Upman is part of your collection." : "Keep exploring the clouds to find this Upman."}</p>{isOwned && <Link href="/my-collection">View My Collection <span aria-hidden="true">→</span></Link>}</div></div>; }
function PagerLink({ direction, upman }: { direction: "previous" | "next"; upman: DetailUpman }) { const isPrevious = direction === "previous"; return <Link href={`/upmans/${upman.slug}`} className={styles.pagerLink}><small>{isPrevious ? "← Previous Upman" : "Next Upman →"}</small><strong>{upman.name}</strong></Link>; }
function LostUpman() { return <main className={`upman-detail-page ${styles.page}`}><section className={styles.lost}><p>Lost in the cloud world</p><h1>This Upman could not be found.</h1><Link href="/upmans" className={styles.back}>← Back to Upmandex</Link></section></main>; }
