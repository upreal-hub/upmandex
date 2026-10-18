import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { prisma } from "@/lib/prisma";
import { getUpmanRarityLabel, UP_MAN_RARITIES, type UpmanRarity } from "@/lib/upman-rarity";
import { publicInventoryWhere, publicUpmanWhere } from "@/lib/upman-visibility";

import { CommunityMembersRoster } from "./CommunityMembersRoster";
import { CommunityLeaderboard } from "./CommunityLeaderboard";
import { CommunityArtwork } from "./CommunityArtwork";
import styles from "./community.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Member = {
  id: string;
  twitchLogin: string;
  displayName: string;
  avatar: string | null;
  collectedCount: number;
  person: { id: string; createdCount: number; representedCount: number } | null;
};

type CommunityUpman = {
  id: string;
  slug: string;
  name: string;
  image: string;
  rarity: UpmanRarity;
  createdAt: Date;
  ownerCount: number;
};

function percentage(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

function compareUpmans(left: CommunityUpman, right: CommunityUpman, direction: "most" | "rarest") {
  const ownershipDifference = direction === "most"
    ? right.ownerCount - left.ownerCount
    : left.ownerCount - right.ownerCount;

  return ownershipDifference
    || left.createdAt.getTime() - right.createdAt.getTime()
    || left.slug.localeCompare(right.slug);
}

export async function CommunityView({ view = "members" }: { view?: "members" | "leaderboards" | "creators" | "highlights" }) {
  const [upmanRows, users, people] = await Promise.all([
    prisma.upman.findMany({
      where: publicUpmanWhere,
      orderBy: [{ createdAt: "asc" }, { slug: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        image: true,
        rarity: true,
        createdAt: true,
        _count: { select: { inventory: true } },
      },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        twitchLogin: true,
        displayName: true,
        avatar: true,
        _count: { select: { inventory: { where: publicInventoryWhere } } },
        person: {
          select: {
            id: true,
            isPublic: true,
            _count: {
              select: {
                createdUpmans: { where: publicUpmanWhere },
                representedUpmans: { where: publicUpmanWhere },
              },
            },
          },
        },
      },
    }),
    prisma.person.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        displayName: true,
        user: { select: { twitchLogin: true, avatar: true } },
        _count: { select: { createdUpmans: { where: publicUpmanWhere } } },
      },
    }),
  ]);

  const upmans: CommunityUpman[] = upmanRows.map((upman) => ({
    id: upman.id,
    slug: upman.slug,
    name: upman.name,
    image: upman.image,
    rarity: upman.rarity as UpmanRarity,
    createdAt: upman.createdAt,
    ownerCount: upman._count.inventory,
  }));

  const members: Member[] = users
    .map((user) => ({
      id: user.id,
      twitchLogin: user.twitchLogin,
      displayName: user.displayName,
      avatar: user.avatar,
      collectedCount: user._count.inventory,
      person: user.person?.isPublic
        ? {
            id: user.person.id,
            createdCount: user.person._count.createdUpmans,
            representedCount: user.person._count.representedUpmans,
          }
        : null,
    }))
    .sort((first, second) =>
      second.collectedCount - first.collectedCount
      || first.displayName.localeCompare(second.displayName)
      || first.twitchLogin.localeCompare(second.twitchLogin),
    );

  const creators = people
    .map((person) => ({
      id: person.id,
      displayName: person.displayName,
      avatar: person.user?.avatar ?? null,
      twitchLogin: person.user?.twitchLogin ?? null,
      createdCount: person._count.createdUpmans,
    }))
    .filter((person) => person.createdCount > 0)
    .sort((first, second) =>
      second.createdCount - first.createdCount
      || first.displayName.localeCompare(second.displayName)
      || first.id.localeCompare(second.id),
    );

  const totalUpmans = upmans.length;
  const communityMembers = members.length;
  const activeCollectors = members.filter((member) => member.collectedCount > 0);
  const communityPossessions = upmans.reduce((sum, upman) => sum + upman.ownerCount, 0);
  const discoveredUpmans = upmans.filter((upman) => upman.ownerCount > 0);
  const globalProgress = percentage(communityPossessions, activeCollectors.length * totalUpmans);
  const topCollectors = activeCollectors;
  const topCreators = creators;
  const mostOwned = discoveredUpmans.length > 0
    ? [...discoveredUpmans].sort((left, right) => compareUpmans(left, right, "most"))[0]
    : null;
  const rarestDiscovered = discoveredUpmans.length > 0
    ? [...discoveredUpmans].sort((left, right) => compareUpmans(left, right, "rarest"))[0]
    : null;
  const rarityProgress = UP_MAN_RARITIES
    .map((rarity) => {
      const rarityUpmans = upmans.filter((upman) => upman.rarity === rarity);
      return {
        rarity,
        total: rarityUpmans.length,
        discovered: rarityUpmans.filter((upman) => upman.ownerCount > 0).length,
      };
    })
    .filter((entry) => entry.total > 0);

  return (
    <main className={`community-page ${styles.page}`}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>EVERY CLOUD FOUND TOGETHER</p>
        <h1>{({ members: "CLOUD MEMBERS", leaderboards: "LEADERBOARDS", creators: "TOP CREATORS", highlights: "COMMUNITY HIGHLIGHTS" })[view]}</h1>
        <p className={styles.intro}>The people, collections, and discoveries that keep the cloud world growing.</p>
      </header>

      <nav className={styles.destinationTabs} aria-label="Community destinations">{([['members', 'Cloud Members'], ['leaderboards', 'Leaderboards'], ['creators', 'Top Creators'], ['highlights', 'Community Highlights']] as const).map(([key, label]) => <Link key={key} href={`/community/${key}`} aria-current={view === key ? "page" : undefined}>{label}</Link>)}</nav>
      {view !== "highlights" && <section className={styles.members} aria-labelledby="community-members-heading">
        <SectionHeading eyebrow="THE PEOPLE EXPLORING" heading={view === "members" ? "COMMUNITY MEMBERS" : view === "creators" ? "CREATOR RANKING" : "COMMUNITY RANKING"} detail={`${communityMembers} ${communityMembers === 1 ? "member" : "members"}`} headingId="community-members-heading" />

        {view === "leaderboards" && <CommunityLeaderboard totalUpmans={totalUpmans} collectors={topCollectors} creators={topCreators} />}
        <div id="leaderboards" className={styles.podiums} aria-label="Community member highlights">

          {view === "creators" && <Podium id="top-creators" title="TOP CREATORS" subtitle="People who have brought new public Upmans into the world.">
            {topCreators.length > 0 ? topCreators.map((creator, index) => (
              <article key={creator.id} className={styles.podiumEntry}>
                <span className={styles.rank} aria-label={`Rank ${index + 1}`}>{index + 1}</span>
                <Identity avatar={creator.avatar} name={creator.displayName} login={creator.twitchLogin} />
                <div className={styles.podiumMetric}><strong>{creator.createdCount}</strong><small>{creator.createdCount === 1 ? "creation" : "creations"}</small></div>
                <div className={styles.podiumLinks}><Link href={`/people/${creator.id}`}>Profile <span aria-hidden="true">↗</span></Link></div>
              </article>
            )) : <EmptyPanel message="Creator stories will appear here as the cloud world grows." />}
          </Podium>}
        </div>

        {view === "members" && <div id="cloud-members">{members.length > 0 ? <CommunityMembersRoster members={members} totalUpmans={totalUpmans} /> : <EmptyRoster />}</div>}
      </section>}

      {view === "highlights" && <><section className={styles.overview} aria-labelledby="community-overview-heading">
        <SectionHeading eyebrow="WHAT WE HAVE ACHIEVED" heading="COMMUNITY OVERVIEW" detail="A shared view of the public Dex." headingId="community-overview-heading" />

        <dl className={styles.overviewStats}>
          <OverviewStat label="Community Members" value={communityMembers} />
          <OverviewStat label="Active Collectors" value={activeCollectors.length} />
          <OverviewStat label="Upmans Discovered" value={`${discoveredUpmans.length} / ${totalUpmans}`} />
          <OverviewStat label="Community Possessions" value={communityPossessions} />
        </dl>

        <section className={styles.progressWorld} aria-label="Global community collection progress">
          <div className={styles.progressCopy}>
            <span>ACTIVE COLLECTOR PROGRESS</span>
            <strong>{formatPercentage(globalProgress)}</strong>
            <p>{communityPossessions} public possessions across {activeCollectors.length} active collector{activeCollectors.length === 1 ? "" : "s"} and {totalUpmans} public Upman{totalUpmans === 1 ? "" : "s"}.</p>
          </div>
          <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(globalProgress.toFixed(1))} aria-label={`Active collector progress: ${formatPercentage(globalProgress)}`}><span style={{ width: `${Math.min(globalProgress, 100)}%` }} /></div>
        </section>

        <div id="community-highlights" className={styles.highlights}>
          <CommunityHighlight title="MOST OWNED" upman={mostOwned} empty="No public Upman has been collected yet." />
          <CommunityHighlight title="RAREST DISCOVERED" upman={rarestDiscovered} empty="The first public discovery is still waiting." />
        </div>
      </section>

      <section className={styles.dex} aria-labelledby="community-dex-heading">
        <SectionHeading eyebrow="WHAT WE HAVE DISCOVERED" heading="COMMUNITY DEX" detail={`${discoveredUpmans.length} of ${totalUpmans} public Upmans discovered together.`} headingId="community-dex-heading" />

        {rarityProgress.length > 0 && (
          <div className={styles.rarityProgress} aria-label="Discovery progress by rarity">
            {rarityProgress.map((entry) => <div key={entry.rarity} className={`${styles.rarityProgressItem} ${rarityClass(entry.rarity)}`}><span>{getUpmanRarityLabel(entry.rarity)}</span><strong>{entry.discovered} / {entry.total}</strong></div>)}
          </div>
        )}

        {upmans.length > 0 ? (
          <div className={styles.dexGrid}>{upmans.map((upman) => <CommunityDexCard key={upman.id} upman={upman} />)}</div>
        ) : <div className={styles.emptyDex}><strong>The public Community Dex is waiting for its first cloud.</strong><p>Public Upmans will appear here as the cloud world grows.</p></div>}
      </section></>}
    </main>
  );
}

function SectionHeading({ eyebrow, heading, detail, headingId }: { eyebrow: string; heading: string; detail: string; headingId: string }) {
  return <header className={styles.sectionHeading}><p>{eyebrow}</p><h2 id={headingId}>{heading}</h2><span>{detail}</span></header>;
}

function OverviewStat({ label, value }: { label: string; value: string | number }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function Podium({ id, title, subtitle, children }: { id?: string; title: string; subtitle: string; children: ReactNode }) {
  return <section id={id} className={styles.podium}><header><p>{title}</p><span>{subtitle}</span></header><div className={styles.podiumList}>{children}</div></section>;
}

function Identity({ avatar, name, login }: { avatar: string | null; name: string; login: string | null }) {
  return <div className={styles.identity}>
    {avatar ? (
      // Stored Twitch avatars can use arbitrary remote hosts; keep the public identity treatment consistent with People.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatar} alt="" />
    ) : <span aria-hidden="true">☁</span>}
    <div><strong>{name}</strong>{login && <small>@{login}</small>}</div>
  </div>;
}

function EmptyPanel({ message }: { message: string }) {
  return <p className={styles.emptyPanel}>{message}</p>;
}

function EmptyRoster() {
  return <div className={styles.emptyRoster}><strong>The community is ready for its first explorer.</strong><p>Once a Twitch explorer joins the cloud world, their progress will appear here.</p></div>;
}

function CommunityHighlight({ title, upman, empty }: { title: string; upman: CommunityUpman | null; empty: string }) {
  return <section className={styles.highlight} aria-label={title}>
    <p>{title}</p>
    {upman ? (
      <Link href={`/upmans/${upman.slug}`} className={`${styles.highlightLink} ${rarityClass(upman.rarity)}`}>
        <span className={styles.highlightArtwork}><Image src={upman.image} alt={upman.name} width={140} height={120} sizes="(max-width: 620px) 34vw, 8rem" /></span>
        <span><small>{getUpmanRarityLabel(upman.rarity)}</small><strong>{upman.name}</strong><em>{upman.ownerCount} {upman.ownerCount === 1 ? "owner" : "owners"}</em></span>
      </Link>
    ) : <span className={styles.highlightEmpty}>{empty}</span>}
  </section>;
}

function CommunityDexCard({ upman }: { upman: CommunityUpman }) {
  if (upman.ownerCount === 0) {
    return <article className={`${styles.dexCard} ${styles.mystery}`} aria-label="Undiscovered Upman"><span className={styles.mysteryArtwork} aria-hidden="true">?</span><span className={styles.dexInfo}><strong>???</strong><em>Undiscovered</em></span></article>;
  }

  return (
    <Link href={`/upmans/${upman.slug}`} className={`${styles.dexCard} ${rarityClass(upman.rarity)}`} aria-label={`View ${upman.name}, ${getUpmanRarityLabel(upman.rarity)}, ${upman.ownerCount} ${upman.ownerCount === 1 ? "owner" : "owners"}`}>
      <span className={styles.dexArtwork}><CommunityArtwork src={upman.image} name={upman.name} /></span>
      <span className={styles.dexInfo}><small className={`${styles.dexRarity} ${upman.rarity === "Secret" ? "rarity-secret" : upman.rarity === "Event" ? "rarity-event" : ""}`}>{getUpmanRarityLabel(upman.rarity)}</small><strong>{upman.name}</strong><em>{upman.ownerCount} {upman.ownerCount === 1 ? "owner" : "owners"}</em></span>
    </Link>
  );
}

function rarityClass(rarity: UpmanRarity) {
  if (rarity === "Secret") return "upman-secret";
  if (rarity === "Event") return "upman-event";
  return styles[rarity.toLowerCase()];
}

