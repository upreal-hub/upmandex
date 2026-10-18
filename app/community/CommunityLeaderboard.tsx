"use client";
/* Twitch avatars can come from arbitrary external hosts. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState } from "react";
import styles from "./community.module.css";

type Collector = { id: string; displayName: string; twitchLogin: string; avatar: string | null; collectedCount: number; person: { id: string } | null };
type Creator = { id: string; displayName: string; twitchLogin: string | null; avatar: string | null; createdCount: number };
type Entry = { id: string; name: string; login: string | null; avatar: string | null; score: number; profile: string | null; collection: string | null };

export function CommunityLeaderboard({ collectors, creators, totalUpmans }: { collectors: Collector[]; creators: Creator[]; totalUpmans: number }) {
  const [filter, setFilter] = useState<"collectors" | "creators">("collectors");
  const entries: Entry[] = filter === "collectors"
    ? collectors.map((member) => ({ id: member.id, name: member.displayName, login: member.twitchLogin, avatar: member.avatar, score: member.collectedCount, profile: member.person ? `/people/${encodeURIComponent(member.person.id)}` : null, collection: `/collection/${encodeURIComponent(member.twitchLogin)}` }))
    : creators.map((person) => ({ id: person.id, name: person.displayName, login: person.twitchLogin, avatar: person.avatar, score: person.createdCount, profile: `/people/${encodeURIComponent(person.id)}`, collection: null }));
  const score = (entry: Entry) => filter === "collectors" ? `${entry.score} / ${totalUpmans} collected` : `${entry.score} created`;

  return <div className={styles.leaderboard}>
    <div className={styles.leaderboardControls}>
      <div className={styles.leaderboardFilters} aria-label="Leaderboard category">
        <button type="button" aria-pressed={filter === "collectors"} onClick={() => setFilter("collectors")}>Collectors</button>
        <button type="button" aria-pressed={filter === "creators"} onClick={() => setFilter("creators")}>Creators</button>
      </div>
      <Link className={styles.myCollectionLink} href="/my-collection">My Collection ↗</Link>
    </div>
    {entries.length ? <>
      <ol className={styles.cloudPodium} aria-label={`Top ${filter}`}>
        {entries.slice(0, 3).map((entry, index) => <li key={entry.id} className={styles.cloudWinner} data-rank={index + 1}>
          <span className={styles.winnerRank}>{index === 0 ? "✦ ♛ #1 ✦" : `#${index + 1}`}</span>
          {entry.avatar ? <img src={entry.avatar} alt="" /> : <span className={styles.winnerAvatar} aria-hidden="true">☁</span>}
          <strong>{entry.name}</strong>{entry.login && <small>@{entry.login}</small>}
          <span className={styles.winnerScore}>{score(entry)}</span>
          <span className={styles.winnerLinks}>{entry.profile && <Link href={entry.profile}>Profile ↗</Link>}{entry.collection && <Link href={entry.collection}>View collection ↗</Link>}</span>
        </li>)}
      </ol>
      {entries.length > 3 && <ol className={styles.rankingList} start={4}>{entries.slice(3).map((entry, index) => <li className={styles.rankingRow} key={entry.id}>
        <span className={styles.rank}>{index + 4}</span><div className={styles.identity}>{entry.avatar ? <img src={entry.avatar} alt="" /> : <span aria-hidden="true">☁</span>}<div><strong>{entry.name}</strong>{entry.login && <small>@{entry.login}</small>}</div></div>
        <strong className={styles.rankingScore}>{score(entry)}</strong><div className={styles.podiumLinks}>{entry.profile && <Link href={entry.profile}>Profile ↗</Link>}{entry.collection && <Link href={entry.collection}>View collection ↗</Link>}</div>
      </li>)}</ol>}
    </> : <p className={styles.emptyPanel}>No {filter} to rank yet.</p>}
  </div>;
}
