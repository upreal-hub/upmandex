"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import type { AchievementCategory, AchievementFamily, AchievementMilestone, AchievementProgress } from "@/lib/achievements";

import styles from "./person.module.css";
import AchievementCustomization, { type DisplayAchievement } from "./AchievementCustomization";

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

function milestoneAriaLabel(family: AchievementFamily, milestone: AchievementMilestone, isDormant: boolean) {
  const state = isDormant ? "tracking coming later" : milestone.isUnlocked ? "unlocked" : milestone.isCurrentlyComplete ? "ready to record" : "in progress";
  return `${family.name}: ${milestone.label}, ${state}`;
}

function progressText(family: AchievementFamily, milestone: AchievementMilestone | undefined, isDormant: boolean, isComplete: boolean) {
  if (isDormant) return "Tracking coming later";
  if (family.key === "lucky-one") return isComplete ? "Legendary pulled" : "Legendary not pulled yet";
  if (family.key === "rarity-completion") return "Each rarity is tracked independently.";
  if (!milestone) return "All milestones earned";
  if (family.key === "collector") return `${milestone.displayCurrent} / ${milestone.displayTarget} Upmans · next: Collector ${milestone.label}`;
  if (family.key === "pull-veteran") return `${milestone.current} / ${milestone.target} pulls`;
  if (family.key === "duplicate-magnet") return `${milestone.current} / ${milestone.target} duplicates`;
  if (family.key === "upman-creator") return `${milestone.current} / ${milestone.target} Upmans created`;
  return `${milestone.current} / ${milestone.target}`;
}

function popoverContent(family: AchievementFamily, milestone: AchievementMilestone, isDormant: boolean) {
  if (isDormant) return { title: family.name.toUpperCase(), copy: family.description, progress: "Tracking coming later" };
  if (family.key === "collector") return { title: `COLLECTOR — ${milestone.label}`, copy: milestone.label === "50%" ? "Own half of the normal UPMANDEX." : `Own ${milestone.label} of the normal UPMANDEX.`, progress: `${milestone.displayCurrent} / ${milestone.displayTarget} Upmans` };
  if (family.key === "rarity-completion") return { title: `${milestone.label.toUpperCase()} COLLECTOR`, copy: `Collect every ${milestone.label} Upman.`, progress: `${milestone.current} / ${milestone.target} ${milestone.label} Upmans` };
  if (family.key === "pull-veteran") return { title: `PULL VETERAN — ${milestone.label}`, copy: `Complete ${milestone.label} tracked UPMANDEX pulls.`, progress: `${milestone.current} / ${milestone.target} pulls` };
  if (family.key === "duplicate-magnet") return { title: `DUPLICATE MAGNET — ${milestone.label}`, copy: `Pull ${milestone.label} duplicates.`, progress: `${milestone.current} / ${milestone.target} duplicates` };
  if (family.key === "upman-creator") return { title: `UPMAN CREATOR — ${milestone.label}`, copy: `Create ${milestone.label} Upmans added to the UPMANDEX.`, progress: `${milestone.current} / ${milestone.target} Upmans created` };
  if (family.key === "lucky-one") return { title: "LUCKY ONE", copy: "Pull a Legendary Upman.", progress: milestone.isCurrentlyComplete ? "Legendary pulled" : "Legendary not pulled yet" };
  return { title: family.name.toUpperCase(), copy: family.description, progress: `${milestone.current} / ${milestone.target}` };
}

function featuredAchievementName(achievement: DisplayAchievement) {
  return /^\d+(?:%)?$/.test(achievement.label) ? `${achievement.name} ${achievement.label}` : achievement.name;
}

function featuredAchievementReward(achievement: DisplayAchievement) {
  return /^\d+(?:%)?$/.test(achievement.label) ? `+${achievement.label}` : achievement.label;
}

export default function AchievementsPanel({ progress, personId, isOwner, achievements, featuredAchievements, identity, loadout, showCustomization = true }: { progress: AchievementProgress; personId: string; isOwner: boolean; achievements: DisplayAchievement[]; featuredAchievements: DisplayAchievement[]; identity: { displayName: string; avatar: string | null; twitchLogin: string | null }; loadout: { equippedTitleAchievementKey: string | null; equippedBackgroundAchievementKey: string | null; equippedBannerAchievementKey: string | null; equippedAccentAchievementKey: string | null }; showCustomization?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<AchievementCategory | "ALL">("ALL");
  const [pinnedMilestone, setPinnedMilestone] = useState<string | null>(null);
  const [hoveredMilestone, setHoveredMilestone] = useState<string | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const activeMilestone = pinnedMilestone ?? hoveredMilestone;
  const visibleCategories = category === "ALL" ? categories : [category];
  const visibleFeatured = featuredAchievements.length
    ? featuredAchievements
    : progress.summary.featured
      .map((featured) => achievements.find((achievement) => achievement.key === featured.key && achievement.unlocked))
      .filter((achievement): achievement is DisplayAchievement => Boolean(achievement));

  const dismissMilestone = useCallback(() => {
    setPinnedMilestone(null);
    setHoveredMilestone(null);
  }, []);

  const close = useCallback(() => {
    dismissMilestone();
    setIsOpen(false);
    requestAnimationFrame(() => openButton.current?.focus());
  }, [dismissMilestone]);

  useEffect(() => {
    if (!isOpen) return;
    closeButton.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (activeMilestone) {
        event.preventDefault();
        dismissMilestone();
        return;
      }
      close();
    }
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-milestone-interaction]")) dismissMilestone();
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeMilestone, close, dismissMilestone, isOpen]);

  return (
    <section className={styles.achievementsSummary} aria-labelledby="achievements-summary-heading">
      <div><p className={styles.eyebrow}>ACHIEVEMENTS</p><h2 id="achievements-summary-heading" className={styles.achievementsTitle}>{progress.summary.unlocked} / {progress.summary.available} unlocked</h2></div>
      <div className={styles.featuredBadges} aria-label="Featured achievements">
        <p>Featured</p>
        <div>{visibleFeatured.length ? visibleFeatured.map((badge) => <span key={badge.key} data-category={badge.category}><b aria-hidden="true">✦</b><strong>{featuredAchievementName(badge)}</strong><small>{featuredAchievementReward(badge)}</small></span>) : <span className={styles.noBadges}>No featured achievements yet</span>}</div>
      </div>
      {isOwner && showCustomization && <AchievementCustomization personId={personId} achievements={achievements} identity={identity} loadout={loadout} featuredAchievementKeys={featuredAchievements.map((achievement) => achievement.key)} />}
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
                return families.length ? <AchievementCategorySection key={value} category={value} families={families} activeMilestone={activeMilestone} pinnedMilestone={pinnedMilestone} onPreview={setHoveredMilestone} onPin={setPinnedMilestone} onDismiss={dismissMilestone} /> : null;
              })}
            </div>
          </section>
        </div>, document.body)}
    </section>
  );
}

function AchievementCategorySection({ category, families, activeMilestone, pinnedMilestone, onPreview, onPin, onDismiss }: { category: AchievementCategory; families: AchievementFamily[]; activeMilestone: string | null; pinnedMilestone: string | null; onPreview: (key: string | null) => void; onPin: (key: string | null) => void; onDismiss: () => void }) {
  return <section className={styles.achievementCategory} data-category={category} aria-labelledby={`achievement-category-${category}`}>
    <header className={styles.categoryHeading}><span aria-hidden="true">✦</span><h3 id={`achievement-category-${category}`}>{categoryLabels[category]}</h3><i aria-hidden="true" /></header>
    <div className={styles.achievementTracks}>{families.map((family) => <AchievementTrack key={family.key} family={family} activeMilestone={activeMilestone} pinnedMilestone={pinnedMilestone} onPreview={onPreview} onPin={onPin} onDismiss={onDismiss} />)}</div>
  </section>;
}

function AchievementTrack({ family, activeMilestone, pinnedMilestone, onPreview, onPin, onDismiss }: { family: AchievementFamily; activeMilestone: string | null; pinnedMilestone: string | null; onPreview: (key: string | null) => void; onPin: (key: string | null) => void; onDismiss: () => void }) {
  const milestones = family.milestones;
  const isIndependent = family.key === "rarity-completion";
  const isDormant = !milestones.some((milestone) => milestone.trackable || milestone.isUnlocked);
  const nextIndex = isDormant || isIndependent ? -1 : milestones.findIndex((milestone) => !milestone.isCurrentlyComplete);
  const fill = isDormant || isIndependent ? 0 : orderedFill(milestones);
  const isComplete = milestones.length > 0 && milestones.every((milestone) => milestone.isUnlocked);
  const trackStyle = { "--track-fill": `${fill}%` } as CSSProperties;
  const nextMilestone = nextIndex >= 0 ? milestones[nextIndex] : undefined;

  return <article className={`${styles.achievementTrack} ${isIndependent ? styles.trackIndependent : ""} ${isDormant ? styles.trackDormant : ""} ${milestones.length === 1 ? styles.trackSingle : ""}`}>
    <header className={styles.trackHeading}><div><h4>{family.name}</h4><p>{family.description}</p></div>{isComplete && <span className={styles.trackComplete}>Completed</span>}</header>
    <div className={styles.trackNodes} style={trackStyle}>
      {!isIndependent && milestones.length > 1 && <span className={styles.trackLine} aria-hidden="true"><span /></span>}
      {milestones.map((milestone, index) => <MilestoneNode key={milestone.key} family={family} milestone={milestone} index={index} total={milestones.length} isTarget={index === nextIndex} isDormant={isDormant} active={activeMilestone === milestone.key} pinned={pinnedMilestone === milestone.key} onPreview={onPreview} onPin={onPin} onDismiss={onDismiss} />)}
    </div>
    <p className={styles.trackProgress}>{progressText(family, nextMilestone, isDormant, isComplete)}</p>
  </article>;
}

function MilestoneNode({ family, milestone, index, total, isTarget, isDormant, active, pinned, onPreview, onPin, onDismiss }: { family: AchievementFamily; milestone: AchievementMilestone; index: number; total: number; isTarget: boolean; isDormant: boolean; active: boolean; pinned: boolean; onPreview: (key: string | null) => void; onPin: (key: string | null) => void; onDismiss: () => void }) {
  const detailId = `achievement-${milestone.key}`;
  const position = index === 0 ? styles.popoverStart : index === total - 1 ? styles.popoverEnd : styles.popoverCenter;
  const preview = () => { if (!pinned) onPreview(milestone.key); };
  const leave = () => { if (!pinned) onPreview(null); };
  return <div className={styles.milestoneNodeWrap} data-milestone-interaction data-rarity={family.key === "rarity-completion" ? milestone.label : undefined} onMouseEnter={preview} onMouseLeave={leave}>
    <button type="button" className={`${styles.milestoneNode} ${nodeState(milestone, isTarget, isDormant)}`} aria-label={milestoneAriaLabel(family, milestone, isDormant)} aria-expanded={active} aria-controls={active ? detailId : undefined} onFocus={preview} onBlur={leave} onClick={() => { if (pinned) onDismiss(); else { onPreview(null); onPin(milestone.key); } }} onKeyDown={(event) => { if (event.key === "Escape" && active) { event.preventDefault(); event.stopPropagation(); onDismiss(); } }}>
      <span aria-hidden="true">{milestone.isCurrentlyComplete && !milestone.isUnlocked && !isDormant ? "•" : ""}</span>
    </button>
    <span className={styles.milestoneLabel}>{milestone.label}</span>
    {active && <MilestonePopover id={detailId} family={family} milestone={milestone} isDormant={isDormant} position={position} />}
  </div>;
}

function MilestonePopover({ id, family, milestone, isDormant, position }: { id: string; family: AchievementFamily; milestone: AchievementMilestone; isDormant: boolean; position: string }) {
  const content = popoverContent(family, milestone, isDormant);
  const state = isDormant ? "Tracking coming later" : milestone.isUnlocked ? "Unlocked" : milestone.isCurrentlyComplete ? "Ready to record" : "In progress";
  return <aside id={id} role="status" className={`${styles.milestonePopover} ${position}`}>
    <p>{content.title}</p><strong>{content.copy}</strong><small>{content.progress}</small><em>{state}</em>
    {milestone.unlockedAt && <time dateTime={milestone.unlockedAt}>Unlocked {formatDate(milestone.unlockedAt)}</time>}
  </aside>;
}
