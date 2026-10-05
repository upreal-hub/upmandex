"use client";

import Link from "next/link";
import { useState } from "react";

import styles from "./community.module.css";

const INITIAL_MEMBER_COUNT = 10;

type CommunityMember = {
  id: string;
  twitchLogin: string;
  displayName: string;
  avatar: string | null;
  collectedCount: number;
  person: { id: string; createdCount: number; representedCount: number } | null;
};

export function CommunityMembersRoster({ members, totalUpmans }: { members: CommunityMember[]; totalUpmans: number }) {
  const [showAll, setShowAll] = useState(false);
  const displayedMembers = showAll ? members : members.slice(0, INITIAL_MEMBER_COUNT);
  const hasMoreMembers = members.length > INITIAL_MEMBER_COUNT;

  return (
    <div className={styles.rosterList} id="community-members-roster">
      {displayedMembers.map((member) => {
        const completion = percentage(member.collectedCount, totalUpmans);
        const contribution = member.person
          ? `${member.person.createdCount} ${member.person.createdCount === 1 ? "creation" : "creations"} · ${member.person.representedCount} represented`
          : null;

        return (
          <article key={member.id} className={styles.collectorRow}>
            <Identity avatar={member.avatar} name={member.displayName} login={member.twitchLogin} />
            <div className={styles.collectionProgress}>
              <div><strong>{member.collectedCount} / {totalUpmans}</strong><span>{formatPercentage(completion)} complete</span></div>
              <div className={styles.miniProgress} aria-label={`${member.displayName}: ${formatPercentage(completion)} collection complete`}><span style={{ width: `${Math.min(completion, 100)}%` }} /></div>
            </div>
            <p className={styles.contribution}>{contribution ?? "—"}</p>
            <MemberLinks member={member} />
          </article>
        );
      })}

      {hasMoreMembers && (
        <button
          type="button"
          className={styles.memberToggle}
          aria-expanded={showAll}
          aria-controls="community-members-roster"
          onClick={() => setShowAll((current) => !current)}
        >
          {showAll ? "Show less" : "View all members"}
        </button>
      )}
    </div>
  );
}

function percentage(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

function Identity({ avatar, name, login }: { avatar: string | null; name: string; login: string | null }) {
  return (
    <div className={styles.identity}>
      {avatar ? (
        // Stored Twitch avatars can use arbitrary remote hosts; keep the public identity treatment consistent with People.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" />
      ) : <span aria-hidden="true">☁</span>}
      <div><strong>{name}</strong>{login && <small>@{login}</small>}</div>
    </div>
  );
}

function MemberLinks({ member }: { member: CommunityMember }) {
  return <div className={styles.podiumLinks}><Link href={`/collection/${encodeURIComponent(member.twitchLogin)}`}>Collection <span aria-hidden="true">↗</span></Link>{member.person && <Link href={`/people/${member.person.id}`}>Profile <span aria-hidden="true">↗</span></Link>}</div>;
}
