"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { AchievementCategory, AchievementFamily, AchievementMilestone, AchievementProgress } from "@/lib/achievements";

import styles from "./person.module.css";

const categories: AchievementCategory[] = ["COLLECTION", "PULLS", "CREATION", "ART", "GARTIC", "STREAM", "EVENTS"];
const categoryLabels: Record<AchievementCategory, string> = { COLLECTION: "Collection", PULLS: "Pulls", CREATION: "Creation", ART: "Art", GARTIC: "Gartic", STREAM: "Stream", EVENTS: "Events" };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
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

function nodeState(milestone: AchievementMilestone, isTarget: boolean, isDormant: boolean) {
  if (isDormant) return styles.nodeDormant;
  if (milestone.isUnlocked) return styles.nodeUnlocked;
  if (milestone.isCurrentlyComplete) return styles.nodeEligible;
  return isTarget ? styles.nodeTarget : styles.nodeLocked;
}

export default function AchievementsPanel({ progress }: { progress: AchievementProgress }) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<AchievementCategory | "ALL">("ALL");
  const closeButton = useRef<HTMLButtonElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const visibleCategories = category === "ALL" ? categories : [category];

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
              {categories.map((value) => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>{categoryLabels[value]}</button>)}
            </div>
            <p className={styles.achievementLegend}>Some paths are visible before their tracking source arrives.</p>
            <div className={styles.achievementCategories}>
              {visibleCategories.map((value) => {
                const families = progress.families.filter((family) => family.category === value);
                return families.length ? <AchievementCategorySection key={value} category={value} families={families} /> : null;
              })}
            </div>
          </section>
        </div>, document.body)}
    </section>
  );
}

function AchievementCategorySection({ category, families }: { category: AchievementCategory; families: AchievementFamily[] }) {
  return <section className={styles.achievementCategory} data-category={category} aria-labelledby={`achievement-category-${category}`}>
    <header className={styles.categoryHeading}><span aria-hidden="true">✦</span><h3 id={`achievement-category-${category}`}>{categoryLabels[category]}</h3><i aria-hidden="true" /></header>
    <div className={styles.achievementTracks}>{families.map((family) => <AchievementTrack key={family.key} family={family} />)}</div>
  </section>;
}

function AchievementTrack({ family }: { family: AchievementFamily }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const milestones = family.milestones;
  const isIndependent = family.key === "rarity-completion";
  const isDormant = !milestones.some((milestone) => milestone.trackable || milestone.isUnlocked);
  const nextIndex = isDormant || isIndependent ? -1 : milestones.findIndex((milestone) => !milestone.isCurrentlyComplete);
  const fill = isDormant || isIndependent ? 0 : orderedFill(milestones);
  const isComplete = milestones.length > 0 && milestones.every((milestone) => milestone.isUnlocked);
  const trackStyle = { "--track-fill": `${fill}%` } as CSSProperties;

  return <article className={`${styles.achievementTrack} ${isIndependent ? styles.trackIndependent : ""} ${isDormant ? styles.trackDormant : ""} ${milestones.length === 1 ? styles.trackSingle : ""}`}>
    <header className={styles.trackHeading}><div><h4>{family.name}</h4><p>{family.description}</p></div>{isComplete && <span className={styles.trackComplete}>Completed</span>}</header>
    <div className={styles.trackNodes} style={trackStyle}>
      {!isIndependent && milestones.length > 1 && <span className={styles.trackLine} aria-hidden="true"><span /></span>}
      {milestones.map((milestone, index) => <MilestoneNode
        key={milestone.key}
        family={family}
        milestone={milestone}
        index={index}
        total={milestones.length}
        isTarget={index === nextIndex}
        isDormant={isDormant}
        active={activeKey === milestone.key}
        onActivate={() => setActiveKey((current) => current === milestone.key ? null : milestone.key)}
        onPreview={() => setActiveKey(milestone.key)}
        onDismiss={() => setActiveKey(null)}
      />)}
    </div>
    <p className={styles.trackProgress}>{isDormant ? "Tracking coming later" : isComplete ? "All milestones earned" : nextIndex >= 0 ? <><strong>{milestones[nextIndex].current} / {milestones[nextIndex].target}</strong> toward {milestones[nextIndex].label}</> : "Each rarity can be completed independently."}</p>
  </article>;
}

function MilestoneNode({ family, milestone, index, total, isTarget, isDormant, active, onActivate, onPreview, onDismiss }: {
  family: AchievementFamily; milestone: AchievementMilestone; index: number; total: number; isTarget: boolean; isDormant: boolean; active: boolean; onActivate: () => void; onPreview: () => void; onDismiss: () => void;
}) {
  const detailId = `achievement-${milestone.key}`;
  const position = index === 0 ? styles.popoverStart : index === total - 1 ? styles.popoverEnd : styles.popoverCenter;
  return <div className={styles.milestoneNodeWrap} data-rarity={family.key === "rarity-completion" ? milestone.label : undefined}>
    <button type="button" className={`${styles.milestoneNode} ${nodeState(milestone, isTarget, isDormant)}`} aria-label={`${family.name}: ${milestone.label}`} aria-expanded={active} aria-controls={active ? detailId : undefined}
      onMouseEnter={onPreview} onFocus={onPreview} onClick={onActivate} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onDismiss(); } }}>
      <span aria-hidden="true">{milestone.isUnlocked ? "✓" : milestone.isCurrentlyComplete && !isDormant ? "•" : ""}</span>
    </button>
    <span className={styles.milestoneLabel}>{milestone.label}</span>
    {active && <MilestonePopover id={detailId} family={family} milestone={milestone} isDormant={isDormant} position={position} />}
  </div>;
}

function MilestonePopover({ id, family, milestone, isDormant, position }: { id: string; family: AchievementFamily; milestone: AchievementMilestone; isDormant: boolean; position: string }) {
  const state = isDormant ? "Tracking coming later" : milestone.isUnlocked ? "Unlocked" : milestone.isCurrentlyComplete ? "Threshold reached — awaiting badge sync" : "In progress";
  return <aside id={id} role="status" className={`${styles.milestonePopover} ${position}`}>
    <p>{family.name} <span>·</span> {milestone.label}</p>
    <strong>{family.description}</strong>
    {!isDormant && <small>{milestone.current} / {milestone.target}</small>}
    <em>{state}</em>
    {milestone.unlockedAt && <time dateTime={milestone.unlockedAt}>Unlocked {formatDate(milestone.unlockedAt)}</time>}
  </aside>;
}
