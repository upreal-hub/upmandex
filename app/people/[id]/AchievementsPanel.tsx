"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { AchievementCategory, AchievementFamily, AchievementMilestone, AchievementProgress } from "@/lib/achievements";

import styles from "./person.module.css";

const categoryLabels: Record<AchievementCategory, string> = {
  COLLECTION: "Collection", PULLS: "Pulls", CREATION: "Creation", ART: "Art", GARTIC: "Gartic", STREAM: "Stream", EVENTS: "Events",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function milestoneState(milestone: AchievementMilestone, isCurrentTarget: boolean) {
  if (milestone.isUnlocked) return styles.nodeUnlocked;
  if (milestone.isCurrentlyComplete) return styles.nodeEligible;
  return isCurrentTarget ? styles.nodeTarget : styles.nodeLocked;
}

function orderedFill(milestones: AchievementMilestone[]) {
  const nextIndex = milestones.findIndex((milestone) => !milestone.isCurrentlyComplete);
  if (nextIndex === -1) return 100;
  if (nextIndex === 0) return 0;
  const previous = milestones[nextIndex - 1];
  const next = milestones[nextIndex];
  const segment = (next.current - previous.target) / (next.target - previous.target);
  return ((nextIndex - 1 + Math.max(0, Math.min(1, segment))) / (milestones.length - 1)) * 100;
}

export default function AchievementsPanel({ progress }: { progress: AchievementProgress }) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<AchievementCategory | "ALL">("ALL");
  const closeButton = useRef<HTMLButtonElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const availableCategories = [...new Set(progress.families.map((family) => family.category))];
  const visibleCategories = category === "ALL" ? availableCategories : [category];

  function close() {
    setIsOpen(false);
    requestAnimationFrame(() => openButton.current?.focus());
  }

  useEffect(() => {
    if (!isOpen) return;
    closeButton.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <section className={styles.achievementsSummary} aria-labelledby="achievements-summary-heading">
      <div><p className={styles.eyebrow}>ACHIEVEMENTS</p><h2 id="achievements-summary-heading" className={styles.achievementsTitle}>{progress.summary.unlocked} / {progress.summary.available} unlocked</h2></div>
      <div className={styles.featuredBadges} aria-label="Recently unlocked achievements">
        {progress.summary.featured.length ? progress.summary.featured.map((badge) => <span key={badge.key} title={badge.key}>✦ {badge.label}</span>) : <span className={styles.noBadges}>No milestones unlocked yet</span>}
      </div>
      <button ref={openButton} type="button" className={styles.achievementsButton} onClick={() => setIsOpen(true)}>View all</button>
      {isOpen && typeof document !== "undefined" && createPortal(
        <div className={styles.achievementsOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="achievements-dialog-title" className={styles.achievementsDialog}>
            <header className={styles.achievementsDialogHeader}>
              <div><p className={styles.eyebrow}>PERSON PROGRESSION</p><h2 id="achievements-dialog-title">Achievements</h2><p>{progress.summary.unlocked} / {progress.summary.available} currently available milestones unlocked</p></div>
              <button ref={closeButton} type="button" className={styles.achievementsClose} onClick={close} aria-label="Close achievements">Close</button>
            </header>
            <div className={styles.achievementFilters} aria-label="Achievement categories">
              <button type="button" aria-pressed={category === "ALL"} onClick={() => setCategory("ALL")}>All</button>
              {availableCategories.map((value) => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>{categoryLabels[value]}</button>)}
            </div>
            <div className={styles.achievementCategories}>
              {visibleCategories.map((value) => {
                const families = progress.families.filter((family) => family.category === value);
                return families.length ? <section key={value} className={`${styles.achievementCategory} ${styles[`category${value}`]}`} aria-labelledby={`achievement-category-${value}`}>
                  <h3 id={`achievement-category-${value}`}>{categoryLabels[value]}</h3>
                  <div className={styles.achievementTracks}>{families.map((family) => <AchievementTrack key={family.key} family={family} />)}</div>
                </section> : null;
              })}
            </div>
          </section>
        </div>, document.body)}
    </section>
  );
}

function AchievementTrack({ family }: { family: AchievementFamily }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const milestones = family.milestones.filter((milestone) => milestone.trackable || milestone.isUnlocked);
  const isIndependent = family.key === "rarity-completion";
  const nextIndex = isIndependent ? -1 : milestones.findIndex((milestone) => !milestone.isCurrentlyComplete);
  const fill = isIndependent ? 0 : orderedFill(milestones);
  const active = milestones.find((milestone) => milestone.key === activeKey) ?? null;
  const isComplete = milestones.length > 0 && milestones.every((milestone) => milestone.isUnlocked);
  const trackStyle = { "--track-fill": `${fill}%` } as CSSProperties;

  return (
    <article className={`${styles.achievementTrack} ${isIndependent ? styles.trackIndependent : ""} ${milestones.length === 1 ? styles.trackSingle : ""}`}>
      <header className={styles.trackHeading}><div><h4>{family.name}</h4><p>{family.description}</p></div>{isComplete && <span className={styles.trackComplete}>Completed</span>}</header>
      <div className={styles.trackNodes} style={trackStyle}>
        {!isIndependent && milestones.length > 1 && <span className={styles.trackLine} aria-hidden="true"><span /></span>}
        {milestones.map((milestone, index) => {
          const isCurrentTarget = index === nextIndex;
          const isActive = activeKey === milestone.key;
          return <div key={milestone.key} className={styles.milestoneNodeWrap}>
            <button type="button" className={`${styles.milestoneNode} ${milestoneState(milestone, isCurrentTarget)}`} aria-label={`${family.name}: ${milestone.label}`} aria-expanded={isActive}
              onMouseEnter={() => setActiveKey(milestone.key)} onFocus={() => setActiveKey(milestone.key)}
              onClick={() => setActiveKey((current) => current === milestone.key ? null : milestone.key)} onKeyDown={(event) => { if (event.key === "Escape") setActiveKey(null); }}>
              <span aria-hidden="true">{milestone.isUnlocked ? "✓" : milestone.isCurrentlyComplete ? "•" : ""}</span>
            </button>
            <span className={styles.milestoneLabel}>{milestone.label}</span>
          </div>;
        })}
      </div>
      <p className={styles.trackProgress}>{isComplete ? "All milestones earned" : nextIndex >= 0 ? <><strong>{milestones[nextIndex].current} / {milestones[nextIndex].target}</strong> toward {milestones[nextIndex].label}</> : "Each rarity can be completed independently."}</p>
      {active && <MilestoneDetails family={family} milestone={active} />}
    </article>
  );
}

function MilestoneDetails({ family, milestone }: { family: AchievementFamily; milestone: AchievementMilestone }) {
  const state = milestone.isUnlocked ? "Unlocked" : milestone.isCurrentlyComplete ? "Currently eligible — sync badges to record it" : "Locked";
  return <aside className={styles.milestoneDetails} aria-live="polite"><p>{family.name} <span>—</span> {milestone.label}</p><strong>{milestone.current} / {milestone.target}</strong><span>{state}</span>{milestone.unlockedAt && <small>Unlocked {formatDate(milestone.unlockedAt)}</small>}</aside>;
}
