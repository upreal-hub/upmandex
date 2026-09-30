import Link from "next/link";
import type { ReactNode } from "react";

import { prisma } from "@/lib/prisma";

import styles from "./community.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Collector = {
  id: string;
  twitchLogin: string;
  displayName: string;
  avatar: string | null;
  collectedCount: number;
  person: {
    id: string;
    isPublic: boolean;
    createdCount: number;
  } | null;
};

function percentage(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function CommunityPage() {
  const [totalUpmans, collectorCount, discoveries, users, people] = await Promise.all([
    prisma.upman.count(),
    prisma.user.count(),
    prisma.inventory.count(),
    prisma.user.findMany({
      select: {
        id: true,
        twitchLogin: true,
        displayName: true,
        avatar: true,
        _count: { select: { inventory: true } },
        person: {
          select: {
            id: true,
            isPublic: true,
            _count: { select: { createdUpmans: true } },
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
        _count: { select: { createdUpmans: true } },
      },
    }),
  ]);

  const collectors: Collector[] = users
    .map((user) => ({
      id: user.id,
      twitchLogin: user.twitchLogin,
      displayName: user.displayName,
      avatar: user.avatar,
      collectedCount: user._count.inventory,
      person: user.person
        ? {
            id: user.person.id,
            isPublic: user.person.isPublic,
            createdCount: user.person._count.createdUpmans,
          }
        : null,
    }))
    .sort((first, second) =>
      second.collectedCount - first.collectedCount ||
      first.displayName.localeCompare(second.displayName) ||
      first.twitchLogin.localeCompare(second.twitchLogin)
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
      second.createdCount - first.createdCount ||
      first.displayName.localeCompare(second.displayName) ||
      first.id.localeCompare(second.id)
    );

  const maxPossibleCollections = collectorCount * totalUpmans;
  const globalProgress = percentage(discoveries, maxPossibleCollections);
  const topCollectors = collectors.slice(0, 3);
  const topCreators = creators.slice(0, 3);

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>EVERY CLOUD FOUND TOGETHER</p>
        <h1>COMMUNITY<br />PROGRESSION</h1>
        <p className={styles.intro}>
          Every discovery is a unique Upman held somewhere in the cloud world.
          Together, collectors are slowly filling the whole Dex.
        </p>

        <section className={styles.progressWorld} aria-label="Global community collection progress">
          <div className={styles.progressCopy}>
            <span>GLOBAL COLLECTION PROGRESS</span>
            <strong>{formatPercentage(globalProgress)}</strong>
            <p>{discoveries} unique discoveries out of {maxPossibleCollections || 0} possible collection spots.</p>
          </div>
          <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(globalProgress.toFixed(1))} aria-label={`Global collection progress: ${formatPercentage(globalProgress)}`}>
            <span style={{ width: `${Math.min(globalProgress, 100)}%` }} />
          </div>
        </section>

        <dl className={styles.globalStats}>
          <div><dt>UPMANS</dt><dd>{totalUpmans}</dd></div>
          <div><dt>COLLECTORS</dt><dd>{collectorCount}</dd></div>
          <div><dt>DISCOVERIES</dt><dd>{discoveries}</dd></div>
        </dl>
      </header>

      <section className={styles.podiums} aria-label="Community podiums">
        <Podium title="TOP COLLECTORS" subtitle="The explorers closest to a complete Dex.">
          {topCollectors.length > 0 ? topCollectors.map((collector, index) => (
            <article key={collector.id} className={styles.podiumEntry}>
              <span className={styles.rank} aria-label={`Rank ${index + 1}`}>{index + 1}</span>
              <Identity avatar={collector.avatar} name={collector.displayName} login={collector.twitchLogin} />
              <div className={styles.podiumMetric}>
                <strong>{collector.collectedCount} <span>/ {totalUpmans}</span></strong>
                <small>{formatPercentage(percentage(collector.collectedCount, totalUpmans))} complete</small>
              </div>
              <div className={styles.podiumLinks}>
                <Link href={`/collection/${encodeURIComponent(collector.twitchLogin)}`}>Collection <span aria-hidden="true">↗</span></Link>
                {collector.person?.isPublic && <Link href={`/people/${collector.person.id}`}>Profile <span aria-hidden="true">↗</span></Link>}
              </div>
            </article>
          )) : <EmptyPodium message="The first collector is still waiting for a cloud to find." />}
        </Podium>

        <Podium title="TOP CREATORS" subtitle="People who have brought new Upmans into the world.">
          {topCreators.length > 0 ? topCreators.map((creator, index) => (
            <article key={creator.id} className={styles.podiumEntry}>
              <span className={styles.rank} aria-label={`Rank ${index + 1}`}>{index + 1}</span>
              <Identity avatar={creator.avatar} name={creator.displayName} login={creator.twitchLogin} />
              <div className={styles.podiumMetric}>
                <strong>{creator.createdCount}</strong>
                <small>{creator.createdCount === 1 ? "creation" : "creations"}</small>
              </div>
              <div className={styles.podiumLinks}>
                <Link href={`/people/${creator.id}`}>Profile <span aria-hidden="true">↗</span></Link>
              </div>
            </article>
          )) : <EmptyPodium message="Creator stories will appear here as the cloud world grows." />}
        </Podium>
      </section>

      <section className={styles.roster} aria-labelledby="community-roster-heading">
        <div className={styles.sectionHeading}>
          <p>THE PEOPLE EXPLORING</p>
          <h2 id="community-roster-heading">COMMUNITY</h2>
          <span>{collectorCount} {collectorCount === 1 ? "collector" : "collectors"}</span>
        </div>

        {collectors.length > 0 ? (
          <div className={styles.rosterList}>
            {collectors.map((collector) => {
              const completion = percentage(collector.collectedCount, totalUpmans);
              const publicPerson = collector.person?.isPublic ? collector.person : null;

              return (
                <article key={collector.id} className={styles.collectorRow}>
                  <Identity avatar={collector.avatar} name={collector.displayName} login={collector.twitchLogin} />
                  <div className={styles.collectionProgress}>
                    <div><strong>{collector.collectedCount} / {totalUpmans}</strong><span>{formatPercentage(completion)} complete</span></div>
                    <div className={styles.miniProgress} aria-label={`${collector.displayName}: ${formatPercentage(completion)} collection complete`}><span style={{ width: `${Math.min(completion, 100)}%` }} /></div>
                  </div>
                  <p className={styles.createdCount}>{publicPerson ? `${publicPerson.createdCount} ${publicPerson.createdCount === 1 ? "creation" : "creations"}` : "—"}</p>
                  <div className={styles.rosterLinks}>
                    {publicPerson && <Link href={`/people/${publicPerson.id}`}>Profile <span aria-hidden="true">↗</span></Link>}
                    <Link href={`/collection/${encodeURIComponent(collector.twitchLogin)}`}>Collection <span aria-hidden="true">↗</span></Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyRoster}><strong>The community is ready for its first explorer.</strong><p>Once a Twitch explorer joins the cloud world, their progress will appear here.</p></div>
        )}
      </section>
    </main>
  );
}

function Podium({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className={styles.podium}><header><p>{title}</p><span>{subtitle}</span></header><div className={styles.podiumList}>{children}</div></section>;
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

function EmptyPodium({ message }: { message: string }) {
  return <p className={styles.emptyPodium}>{message}</p>;
}
