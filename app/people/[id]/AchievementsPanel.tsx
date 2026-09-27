"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

import type { AchievementCategory, AchievementProgress } from "@/lib/achievements";

import styles from "./person.module.css";

const categoryLabels: Record<AchievementCategory, string> = {
  COLLECTION: "Collection",
  PULLS: "Pulls",
  CREATION: "Creation",
  ART: "Art",
  GARTIC: "Gartic",
  STREAM: "Stream",
  EVENTS: "Events",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default function AchievementsPanel({ progress }: { progress: AchievementProgress }) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<AchievementCategory | "ALL">("ALL");
  const closeButton = useRef<HTMLButtonElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const availableCategories = [...new Set(progress.families.map((family) => family.category))];
  const visibleFamilies = category === "ALL" ? progress.families : progress.families.filter((family) => family.category === category);

  useEffect(() => {
    if (!isOpen) return;
    closeButton.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function close() {
    setIsOpen(false);
    requestAnimationFrame(() => openButton.current?.focus());
  }

  return (
    <section className={styles.achievementsSummary} aria-labelledby="achievements-summary-heading">
      <div>
        <p className={styles.eyebrow}>ACHIEVEMENTS</p>
        <h2 id="achievements-summary-heading" className={styles.achievementsTitle}>{progress.summary.unlocked} / {progress.summary.available} unlocked</h2>
      </div>
      <div className={styles.featuredBadges} aria-label="Recently unlocked achievements">
        {progress.summary.featured.length ? progress.summary.featured.map((badge) => <span key={badge.key} title={badge.key}>✦ {badge.label}</span>) : <span className={styles.noBadges}>No milestones unlocked yet</span>}
      </div>
      <button ref={openButton} type="button" className={styles.achievementsButton} onClick={() => setIsOpen(true)}>View all</button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div className={styles.achievementsOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="achievements-dialog-title" className={styles.achievementsDialog}>
            <header className={styles.achievementsDialogHeader}>
              <div>
                <p className={styles.eyebrow}>PERSON PROGRESSION</p>
                <h2 id="achievements-dialog-title">Achievements</h2>
                <p>{progress.summary.unlocked} / {progress.summary.available} currently available milestones unlocked</p>
              </div>
              <button ref={closeButton} type="button" className={styles.achievementsClose} onClick={close} aria-label="Close achievements">Close</button>
            </header>
            <div className={styles.achievementFilters} aria-label="Achievement categories">
              <button type="button" aria-pressed={category === "ALL"} onClick={() => setCategory("ALL")}>All</button>
              {availableCategories.map((value) => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>{categoryLabels[value]}</button>)}
            </div>
            <div className={styles.achievementFamilies}>
              {visibleFamilies.map((family) => <AchievementFamilyCard key={family.key} family={family} />)}
            </div>
          </section>
        </div>,
        document.body
      )}
    </section>
  );
}

function AchievementFamilyCard({ family }: { family: AchievementProgress["families"][number] }) {
  const visibleMilestones = family.milestones.filter((milestone) => milestone.trackable || milestone.isUnlocked);
  const next = visibleMilestones.find((milestone) => !milestone.isCurrentlyComplete);

  return (
    <article className={styles.achievementFamily}>
      <div className={styles.achievementFamilyHeading}>
        <span aria-hidden="true">✦</span>
        <div><p>{categoryLabels[family.category]}</p><h3>{family.name}</h3></div>
      </div>
      <p className={styles.achievementDescription}>{family.description}</p>
      <div className={styles.achievementMilestones}>
        {visibleMilestones.map((milestone) => <span key={milestone.key} className={milestone.isUnlocked ? styles.milestoneUnlocked : milestone.isCurrentlyComplete ? styles.milestoneReady : styles.milestonePending}>
          <strong>{milestone.isUnlocked ? "✓" : milestone.isCurrentlyComplete ? "●" : "○"}</strong> {milestone.label}
          {milestone.isUnlocked && milestone.unlockedAt && <small>Unlocked {formatDate(milestone.unlockedAt)}</small>}
        </span>)}
      </div>
      {next ? <p className={styles.achievementProgress}>Next: <strong>{next.current} / {next.target}</strong> toward {next.label}</p> : <p className={styles.achievementProgress}><strong>All available milestones earned</strong></p>}
    </article>
  );
}
