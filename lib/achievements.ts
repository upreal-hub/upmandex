import "server-only";

import { prisma } from "@/lib/prisma";

export const ACHIEVEMENT_CATEGORIES = [
  "COLLECTION",
  "PULLS",
  "CREATION",
  "ART",
  "GARTIC",
  "STREAM",
  "EVENTS",
] as const;

export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

type AchievementMetric =
  | "collection-percent"
  | "rarity-completion"
  | "pull-count"
  | "legendary-pull"
  | "duplicate-pulls"
  | "creation-count"
  | "unavailable";

type AchievementDefinition = {
  key: string;
  family: string;
  category: AchievementCategory;
  name: string;
  description: string;
  label: string;
  metric: AchievementMetric;
  target: number;
  rarity?: string;
  order: number;
};

const definitions: AchievementDefinition[] = [
  { key: "collector-10", family: "collector", category: "COLLECTION", name: "Collector", description: "Discover the normal UPMANDEX collection.", label: "10%", metric: "collection-percent", target: 10, order: 10 },
  { key: "collector-50", family: "collector", category: "COLLECTION", name: "Collector", description: "Discover the normal UPMANDEX collection.", label: "50%", metric: "collection-percent", target: 50, order: 20 },
  { key: "collector-100", family: "collector", category: "COLLECTION", name: "Collector", description: "Discover the normal UPMANDEX collection.", label: "100%", metric: "collection-percent", target: 100, order: 30 },
  ...["Common", "Rare", "Epic", "Mythic", "Legendary"].map((rarity, index) => ({ key: `rarity-${rarity.toLowerCase()}`, family: "rarity-completion", category: "COLLECTION" as const, name: "Rarity Hunter", description: "Complete each currently eligible rarity set.", label: rarity, metric: "rarity-completion" as const, target: 1, rarity, order: 40 + index })),
  { key: "pull-veteran-10", family: "pull-veteran", category: "PULLS", name: "Pull Veteran", description: "Resolve pulls through the new UPMANDEX Pull System.", label: "10", metric: "pull-count", target: 10, order: 10 },
  { key: "pull-veteran-100", family: "pull-veteran", category: "PULLS", name: "Pull Veteran", description: "Resolve pulls through the new UPMANDEX Pull System.", label: "100", metric: "pull-count", target: 100, order: 20 },
  { key: "pull-veteran-500", family: "pull-veteran", category: "PULLS", name: "Pull Veteran", description: "Resolve pulls through the new UPMANDEX Pull System.", label: "500", metric: "pull-count", target: 500, order: 30 },
  { key: "lucky-one", family: "lucky-one", category: "PULLS", name: "Lucky One", description: "Pull a Legendary Upman through the new Pull System.", label: "Legendary", metric: "legendary-pull", target: 1, order: 40 },
  { key: "duplicate-magnet-10", family: "duplicate-magnet", category: "PULLS", name: "Duplicate Magnet", description: "Find duplicate pulls through the new Pull System.", label: "10", metric: "duplicate-pulls", target: 10, order: 50 },
  { key: "duplicate-magnet-50", family: "duplicate-magnet", category: "PULLS", name: "Duplicate Magnet", description: "Find duplicate pulls through the new Pull System.", label: "50", metric: "duplicate-pulls", target: 50, order: 60 },
  { key: "duplicate-magnet-100", family: "duplicate-magnet", category: "PULLS", name: "Duplicate Magnet", description: "Find duplicate pulls through the new Pull System.", label: "100", metric: "duplicate-pulls", target: 100, order: 70 },
  { key: "upman-creator-1", family: "upman-creator", category: "CREATION", name: "Upman Creator", description: "Create canonical Upmans for the UPMANDEX.", label: "1", metric: "creation-count", target: 1, order: 10 },
  { key: "upman-creator-10", family: "upman-creator", category: "CREATION", name: "Upman Creator", description: "Create canonical Upmans for the UPMANDEX.", label: "10", metric: "creation-count", target: 10, order: 20 },
  { key: "upman-creator-50", family: "upman-creator", category: "CREATION", name: "Upman Creator", description: "Create canonical Upmans for the UPMANDEX.", label: "50", metric: "creation-count", target: 50, order: 30 },
  ...[
    ["artist-1", "artist", "ART", "Artist", "Publish drawings for the UPMANDEX.", "1", 1], ["artist-10", "artist", "ART", "Artist", "Publish drawings for the UPMANDEX.", "10", 10], ["artist-100", "artist", "ART", "Artist", "Publish drawings for the UPMANDEX.", "100", 100],
    ["gartic-regular-1", "gartic-regular", "GARTIC", "Gartic Regular", "Participate in Gartic Phone sessions.", "1", 1], ["gartic-regular-10", "gartic-regular", "GARTIC", "Gartic Regular", "Participate in Gartic Phone sessions.", "10", 10], ["gartic-regular-50", "gartic-regular", "GARTIC", "Gartic Regular", "Participate in Gartic Phone sessions.", "50", 50],
    ["gartic-gallery-1", "gartic-gallery", "GARTIC", "Gartic Gallery", "Keep or publish Gartic drawings.", "1", 1], ["gartic-gallery-10", "gartic-gallery", "GARTIC", "Gartic Gallery", "Keep or publish Gartic drawings.", "10", 10], ["gartic-gallery-50", "gartic-gallery", "GARTIC", "Gartic Gallery", "Keep or publish Gartic drawings.", "50", 50],
    ["checked-in-1", "checked-in", "STREAM", "Checked In", "Check in during streams.", "1", 1], ["checked-in-10", "checked-in", "STREAM", "Checked In", "Check in during streams.", "10", 10], ["checked-in-50", "checked-in", "STREAM", "Checked In", "Check in during streams.", "50", 50], ["checked-in-100", "checked-in", "STREAM", "Checked In", "Check in during streams.", "100", 100],
    ["event-veteran-1", "event-veteran", "EVENTS", "Event Veteran", "Participate in UPMANDEX events.", "1", 1], ["event-veteran-10", "event-veteran", "EVENTS", "Event Veteran", "Participate in UPMANDEX events.", "10", 10], ["event-veteran-50", "event-veteran", "EVENTS", "Event Veteran", "Participate in UPMANDEX events.", "50", 50],
    ["event-collector-1", "event-collector", "EVENTS", "Event Collector", "Collect Event Upmans.", "1", 1], ["event-collector-10", "event-collector", "EVENTS", "Event Collector", "Collect Event Upmans.", "10", 10], ["event-collector-25", "event-collector", "EVENTS", "Event Collector", "Collect Event Upmans.", "25", 25],
  ].map(([key, family, category, name, description, label, target], index) => ({ key: key as string, family: family as string, category: category as AchievementCategory, name: name as string, description: description as string, label: label as string, metric: "unavailable" as const, target: target as number, order: 100 + index })),
];

export type AchievementMilestone = {
  key: string;
  label: string;
  current: number;
  target: number;
  trackable: boolean;
  isCurrentlyComplete: boolean;
  isUnlocked: boolean;
  unlockedAt: string | null;
};

export type AchievementFamily = {
  key: string;
  category: AchievementCategory;
  name: string;
  description: string;
  order: number;
  milestones: AchievementMilestone[];
};

export type AchievementProgress = {
  families: AchievementFamily[];
  summary: { unlocked: number; available: number; featured: { key: string; label: string }[] };
};

type EvaluationContext = {
  hasLinkedUser: boolean;
  collectionOwned: number;
  collectionTotal: number;
  rarityOwned: Map<string, number>;
  rarityTotal: Map<string, number>;
  pulls: number;
  duplicatePulls: number;
  hasLegendaryPull: boolean;
  creations: number;
};

function metricValue(definition: AchievementDefinition, context: EvaluationContext) {
  switch (definition.metric) {
    case "collection-percent":
      return context.collectionTotal > 0
        ? Math.floor((context.collectionOwned / context.collectionTotal) * 100)
        : 0;
    case "rarity-completion":
      return context.rarityOwned.get(definition.rarity ?? "") ?? 0;
    case "pull-count": return context.pulls;
    case "legendary-pull": return context.hasLegendaryPull ? 1 : 0;
    case "duplicate-pulls": return context.duplicatePulls;
    case "creation-count": return context.creations;
    case "unavailable": return 0;
  }
}

function metricTarget(definition: AchievementDefinition, context: EvaluationContext) {
  return definition.metric === "rarity-completion"
    ? context.rarityTotal.get(definition.rarity ?? "") ?? 0
    : definition.target;
}

function isTrackable(definition: AchievementDefinition, context: EvaluationContext) {
  if (definition.metric === "unavailable") return false;
  if (definition.metric === "collection-percent") return context.hasLinkedUser && context.collectionTotal > 0;
  if (definition.metric === "rarity-completion") return context.hasLinkedUser && (context.rarityTotal.get(definition.rarity ?? "") ?? 0) > 0;
  if (["pull-count", "legendary-pull", "duplicate-pulls"].includes(definition.metric)) return context.hasLinkedUser;
  return true;
}

export async function getAchievementProgress(personId: string): Promise<AchievementProgress | null> {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: {
      id: true,
      userId: true,
      achievements: {
        select: { achievementKey: true, unlockedAt: true },
        orderBy: [{ unlockedAt: "desc" }, { achievementKey: "asc" }],
      },
    },
  });
  if (!person) return null;

  const [upmans, creations, inventory, pulls] = await Promise.all([
    prisma.upman.findMany({ select: { id: true, rarity: true } }),
    prisma.upman.count({ where: { creatorPersonId: person.id } }),
    person.userId ? prisma.inventory.findMany({ where: { userId: person.userId }, select: { upman: { select: { rarity: true } } } }) : Promise.resolve([]),
    person.userId ? prisma.pullEvent.findMany({ where: { userId: person.userId }, select: { result: true, upmanRarity: true } }) : Promise.resolve([]),
  ]);

  const rarityTotal = new Map<string, number>();
  const rarityOwned = new Map<string, number>();
  for (const upman of upmans) rarityTotal.set(upman.rarity, (rarityTotal.get(upman.rarity) ?? 0) + 1);
  for (const item of inventory) rarityOwned.set(item.upman.rarity, (rarityOwned.get(item.upman.rarity) ?? 0) + 1);

  const context: EvaluationContext = {
    hasLinkedUser: Boolean(person.userId),
    collectionOwned: inventory.length,
    collectionTotal: upmans.length,
    rarityOwned,
    rarityTotal,
    pulls: pulls.length,
    duplicatePulls: pulls.filter((pull) => pull.result === "DUPLICATE").length,
    hasLegendaryPull: pulls.some((pull) => pull.upmanRarity === "Legendary"),
    creations,
  };
  const unlocks = new Map(person.achievements.map((achievement) => [achievement.achievementKey, achievement.unlockedAt.toISOString()]));
  const byFamily = new Map<string, AchievementFamily>();

  for (const definition of definitions) {
    const value = metricValue(definition, context);
    const target = metricTarget(definition, context);
    const unlockedAt = unlocks.get(definition.key) ?? null;
    const milestone: AchievementMilestone = {
      key: definition.key,
      label: definition.label,
      current: value,
      target,
      trackable: isTrackable(definition, context),
      isCurrentlyComplete: target > 0 && value >= target,
      isUnlocked: Boolean(unlockedAt),
      unlockedAt,
    };
    const existing = byFamily.get(definition.family);
    if (existing) {
      existing.milestones.push(milestone);
    } else {
      byFamily.set(definition.family, {
        key: definition.family,
        category: definition.category,
        name: definition.name,
        description: definition.description,
        order: definition.order,
        milestones: [milestone],
      });
    }
  }

  const families = [...byFamily.values()]
    .map((family) => ({ ...family, milestones: family.milestones.sort((a, b) => definitions.find((definition) => definition.key === a.key)!.order - definitions.find((definition) => definition.key === b.key)!.order) }))
    .sort((a, b) => a.order - b.order);
  const visibleMilestones = families.flatMap((family) => family.milestones.filter((milestone) => milestone.trackable || milestone.isUnlocked));
  const unlocked = visibleMilestones.filter((milestone) => milestone.isUnlocked);

  return {
    families,
    summary: {
      unlocked: unlocked.length,
      available: visibleMilestones.length,
      featured: unlocked
        .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""))
        .slice(0, 4)
        .map((milestone) => ({ key: milestone.key, label: milestone.label })),
    },
  };
}

export async function syncPersonAchievements(personId: string) {
  const progress = await getAchievementProgress(personId);
  if (!progress) return null;

  const pending = progress.families
    .flatMap((family) => family.milestones)
    .filter((milestone) => milestone.trackable && milestone.isCurrentlyComplete && !milestone.isUnlocked)
    .map((milestone) => ({ personId, achievementKey: milestone.key }));

  if (pending.length) {
    await prisma.personAchievement.createMany({ data: pending, skipDuplicates: true });
  }

  return getAchievementProgress(personId);
}
