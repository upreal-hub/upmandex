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
  cosmetic: AchievementCosmeticBundle;
};

export type CosmeticSlot = "title" | "background" | "banner" | "accent";

export type AchievementCosmeticBundle = {
  title: { label: string; styleKey: string };
  background: { label: string; styleKey: string };
  banner: { label: string; styleKey: string };
  accent: { label: string; styleKey: string };
};

type AchievementDefinitionInput = Omit<AchievementDefinition, "cosmetic">;

function bundle(key: string, title: string, background: string, banner: string, accent: string): AchievementCosmeticBundle {
  return {
    title: { label: title, styleKey: `title-${key}` },
    background: { label: background, styleKey: `background-${key}` },
    banner: { label: banner, styleKey: `banner-${key}` },
    accent: { label: accent, styleKey: `accent-${accent.toLowerCase().replaceAll(" ", "-")}` },
  };
}

/** Controlled, composable cosmetics. Person records retain achievement keys, never CSS values. */
const achievementCosmetics: Record<string, AchievementCosmeticBundle> = {
  "collector-10": bundle("collector-10", "Cloud Collector", "Morning Sky", "Simple Cloud Line", "Cyan"),
  "collector-50": bundle("collector-50", "Upman Hoarder", "Lively Cloud Sky", "Hoarder Clouds", "Electric Blue"),
  "collector-100": bundle("collector-100", "DEX MASTER", "Dex Master Sky", "Monumental Horizon", "White Gold"),
  "rarity-common": bundle("rarity-common", "Green Hunter", "Verdant Day Sky", "Green Cloud Line", "Common Green"),
  "rarity-rare": bundle("rarity-rare", "Blue Hunter", "Rare Light-Ray Sky", "Blue Light Streak", "Rare Blue"),
  "rarity-epic": bundle("rarity-epic", "Purple Hunter", "Epic Twilight", "Purple Star Clouds", "Epic Purple"),
  "rarity-mythic": bundle("rarity-mythic", "Red Hunter", "Mythic Sunset", "Red Horizon", "Mythic Red"),
  "rarity-legendary": bundle("rarity-legendary", "Golden Hunter", "Legendary Dawn", "Golden Star Clouds", "Legendary Gold"),
  "pull-veteran-10": bundle("pull-veteran-10", "First Pulls", "First Pull Sky", "Single Pull Streak", "Cyan"),
  "pull-veteran-100": bundle("pull-veteran-100", "Pull Veteran", "Veteran Pull Sky", "Crossing Pull Streaks", "Blue Violet"),
  "pull-veteran-500": bundle("pull-veteran-500", "Pull Addict", "Pull Storm", "Pull Storm Banner", "Bright Cyan"),
  "lucky-one": bundle("lucky-one", "Lucky One", "Lucky Night", "Golden Sparkle", "Legendary Gold"),
  "duplicate-magnet-10": bundle("duplicate-magnet-10", "Déjà Vu", "Soft Echo Sky", "Double Motif", "Cyan"),
  "duplicate-magnet-50": bundle("duplicate-magnet-50", "Again?!", "Echo Pattern Sky", "Repeated Motif", "Epic Purple"),
  "duplicate-magnet-100": bundle("duplicate-magnet-100", "Duplicate Magnet", "Maximum Echo Sky", "Magnetic Echoes", "Pink"),
  "upman-creator-1": bundle("upman-creator-1", "Upman Creator", "Sketch Sky", "Sketch Line", "Cyan"),
  "upman-creator-10": bundle("upman-creator-10", "Upman Maker", "Maker Grid Sky", "Creative Lines", "Rare Blue"),
  "upman-creator-50": bundle("upman-creator-50", "Upman Factory", "Factory Glow Sky", "Workshop Horizon", "Legendary Gold"),
  "artist-1": bundle("artist-1", "Artist", "Painted Sky", "Single Brush Band", "Paint Blue"),
  "artist-10": bundle("artist-10", "Sky Painter", "Expressive Sky", "Color Strokes", "Epic Purple"),
  "artist-100": bundle("artist-100", "Master Artist", "Masterpiece Sky", "Painterly Horizon", "Legendary Gold"),
  "gartic-regular-1": bundle("gartic-regular-1", "Doodler", "Doodle Day Sky", "Tiny Scribbles", "Cyan"),
  "gartic-regular-10": bundle("gartic-regular-10", "Gartic Regular", "Playful Doodle Sky", "Doodle Parade", "Epic Purple"),
  "gartic-regular-50": bundle("gartic-regular-50", "Gartic Gremlin", "Doodle Chaos Sky", "Gremlin Scribbles", "Pink"),
  "gartic-gallery-1": bundle("gartic-gallery-1", "On The Fridge", "Framed Day Sky", "Single Frame", "Rare Blue"),
  "gartic-gallery-10": bundle("gartic-gallery-10", "Gallery Regular", "Gallery Sky", "Frame Sequence", "Epic Purple"),
  "gartic-gallery-50": bundle("gartic-gallery-50", "Museum Piece", "Museum Light Sky", "Museum Frame", "Legendary Gold"),
  "checked-in-1": bundle("checked-in-1", "I Was Here", "Quiet Evening", "Check Light", "Cyan"),
  "checked-in-10": bundle("checked-in-10", "Regular", "Regular Evening", "Little Lights", "Rare Blue"),
  "checked-in-50": bundle("checked-in-50", "Familiar Face", "Warm Community Night", "Warm Light Cluster", "Epic Purple"),
  "checked-in-100": bundle("checked-in-100", "Always Here", "Always Here Night", "Moonlit Clouds", "Legendary Gold"),
  "event-veteran-1": bundle("event-veteran-1", "Been There", "Event Pass Sky", "Single Event Pass", "Cyan"),
  "event-veteran-10": bundle("event-veteran-10", "Event Regular", "Event Pattern Sky", "Event Pass Pattern", "Epic Purple"),
  "event-veteran-50": bundle("event-veteran-50", "I Was There", "Event Memory Sky", "Memory Layers", "Legendary Gold"),
  "event-collector-1": bundle("event-collector-1", "Souvenir Hunter", "Souvenir Sky", "Hidden Souvenir", "Rare Blue"),
  "event-collector-10": bundle("event-collector-10", "Event Hunter", "Discovery Sky", "Discovery Sequence", "Epic Purple"),
  "event-collector-25": bundle("event-collector-25", "Event Archivist", "Archive Light Sky", "Archive Layers", "Legendary Gold"),
};

function cosmeticFor(definition: AchievementDefinitionInput): AchievementCosmeticBundle {
  const cosmetic = achievementCosmetics[definition.key];
  if (!cosmetic) throw new Error(`Missing achievement cosmetic bundle for ${definition.key}`);
  return cosmetic;
}

const rawDefinitions: AchievementDefinitionInput[] = [
  { key: "collector-10", family: "collector", category: "COLLECTION", name: "Collector", description: "Own the normal UPMANDEX collection.", label: "10%", metric: "collection-percent", target: 10, order: 10 },
  { key: "collector-50", family: "collector", category: "COLLECTION", name: "Collector", description: "Own the normal UPMANDEX collection.", label: "50%", metric: "collection-percent", target: 50, order: 20 },
  { key: "collector-100", family: "collector", category: "COLLECTION", name: "Collector", description: "Own the normal UPMANDEX collection.", label: "100%", metric: "collection-percent", target: 100, order: 30 },
  ...["Common", "Rare", "Epic", "Mythic", "Legendary"].map((rarity, index) => ({ key: `rarity-${rarity.toLowerCase()}`, family: "rarity-completion", category: "COLLECTION" as const, name: "Rarity Hunter", description: "Collect every Upman of each rarity.", label: rarity, metric: "rarity-completion" as const, target: 1, rarity, order: 40 + index })),
  { key: "pull-veteran-10", family: "pull-veteran", category: "PULLS", name: "Pull Veteran", description: "Pull Upmans through the UPMANDEX.", label: "10", metric: "pull-count", target: 10, order: 10 },
  { key: "pull-veteran-100", family: "pull-veteran", category: "PULLS", name: "Pull Veteran", description: "Pull Upmans through the UPMANDEX.", label: "100", metric: "pull-count", target: 100, order: 20 },
  { key: "pull-veteran-500", family: "pull-veteran", category: "PULLS", name: "Pull Veteran", description: "Pull Upmans through the UPMANDEX.", label: "500", metric: "pull-count", target: 500, order: 30 },
  { key: "lucky-one", family: "lucky-one", category: "PULLS", name: "Lucky One", description: "Pull a Legendary Upman.", label: "Legendary", metric: "legendary-pull", target: 1, order: 40 },
  { key: "duplicate-magnet-10", family: "duplicate-magnet", category: "PULLS", name: "Duplicate Magnet", description: "Pull duplicate Upmans.", label: "10", metric: "duplicate-pulls", target: 10, order: 50 },
  { key: "duplicate-magnet-50", family: "duplicate-magnet", category: "PULLS", name: "Duplicate Magnet", description: "Pull duplicate Upmans.", label: "50", metric: "duplicate-pulls", target: 50, order: 60 },
  { key: "duplicate-magnet-100", family: "duplicate-magnet", category: "PULLS", name: "Duplicate Magnet", description: "Pull duplicate Upmans.", label: "100", metric: "duplicate-pulls", target: 100, order: 70 },
  { key: "upman-creator-1", family: "upman-creator", category: "CREATION", name: "Upman Creator", description: "Create Upmans added to the UPMANDEX.", label: "1", metric: "creation-count", target: 1, order: 10 },
  { key: "upman-creator-10", family: "upman-creator", category: "CREATION", name: "Upman Creator", description: "Create Upmans added to the UPMANDEX.", label: "10", metric: "creation-count", target: 10, order: 20 },
  { key: "upman-creator-50", family: "upman-creator", category: "CREATION", name: "Upman Creator", description: "Create Upmans added to the UPMANDEX.", label: "50", metric: "creation-count", target: 50, order: 30 },
  ...[
    ["artist-1", "artist", "ART", "Artist", "Share artwork with the UPMANDEX community.", "1", 1], ["artist-10", "artist", "ART", "Artist", "Share artwork with the UPMANDEX community.", "10", 10], ["artist-100", "artist", "ART", "Artist", "Share artwork with the UPMANDEX community.", "100", 100],
    ["gartic-regular-1", "gartic-regular", "GARTIC", "Gartic Regular", "Take part in Gartic Phone sessions.", "1", 1], ["gartic-regular-10", "gartic-regular", "GARTIC", "Take part in Gartic Phone sessions.", "10", 10], ["gartic-regular-50", "gartic-regular", "GARTIC", "Take part in Gartic Phone sessions.", "50", 50],
    ["gartic-gallery-1", "gartic-gallery", "GARTIC", "Gartic Gallery", "Have Gartic drawings saved to the gallery.", "1", 1], ["gartic-gallery-10", "gartic-gallery", "GARTIC", "Gartic Gallery", "Have Gartic drawings saved to the gallery.", "10", 10], ["gartic-gallery-50", "gartic-gallery", "GARTIC", "Gartic Gallery", "Have Gartic drawings saved to the gallery.", "50", 50],
    ["checked-in-1", "checked-in", "STREAM", "Checked In", "Check in during upreal_ streams.", "1", 1], ["checked-in-10", "checked-in", "STREAM", "Checked In", "Check in during upreal_ streams.", "10", 10], ["checked-in-50", "checked-in", "STREAM", "Checked In", "Check in during upreal_ streams.", "50", 50], ["checked-in-100", "checked-in", "STREAM", "Checked In", "Check in during upreal_ streams.", "100", 100],
    ["event-veteran-1", "event-veteran", "EVENTS", "Event Veteran", "Take part in UPMANDEX events.", "1", 1], ["event-veteran-10", "event-veteran", "EVENTS", "Event Veteran", "Take part in UPMANDEX events.", "10", 10], ["event-veteran-50", "event-veteran", "EVENTS", "Event Veteran", "Take part in UPMANDEX events.", "50", 50],
    ["event-collector-1", "event-collector", "EVENTS", "Event Collector", "Collect Event Upmans.", "1", 1], ["event-collector-10", "event-collector", "EVENTS", "Event Collector", "Collect Event Upmans.", "10", 10], ["event-collector-25", "event-collector", "EVENTS", "Event Collector", "Collect Event Upmans.", "25", 25],
  ].map(([key, family, category, name, description, label, target], index) => ({ key: key as string, family: family as string, category: category as AchievementCategory, name: name as string, description: description as string, label: label as string, metric: "unavailable" as const, target: target as number, order: 100 + index })),
];

const definitions: AchievementDefinition[] = rawDefinitions.map((definition) => ({ ...definition, cosmetic: cosmeticFor(definition) }));

if (definitions.some((definition) => !definition.cosmetic.title || !definition.cosmetic.background || !definition.cosmetic.banner || !definition.cosmetic.accent)) {
  throw new Error("Every achievement definition must provide a complete cosmetic bundle.");
}

export function getAchievementDefinition(key: string) {
  return definitions.find((definition) => definition.key === key) ?? null;
}

export function getAchievementCosmetic(key: string, slot: CosmeticSlot) {
  return getAchievementDefinition(key)?.cosmetic[slot] ?? null;
}

export function getAchievementCatalog() {
  return definitions;
}

export type AchievementMilestone = {
  key: string;
  label: string;
  current: number;
  target: number;
  displayCurrent: number;
  displayTarget: number;
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
      displayCurrent: definition.metric === "collection-percent" ? context.collectionOwned : value,
      displayTarget: definition.metric === "collection-percent" ? Math.ceil((context.collectionTotal * definition.target) / 100) : target,
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

export async function syncLinkedPersonAchievements(userId: string) {
  const person = await prisma.person.findUnique({
    where: { userId },
    select: { id: true },
  });

  return person ? syncPersonAchievements(person.id) : null;
}

export async function safelySyncPersonAchievements(personId: string) {
  try {
    return await syncPersonAchievements(personId);
  } catch {
    console.error("Person achievement synchronization failed after canonical activity.");
    return null;
  }
}

export async function safelySyncLinkedPersonAchievements(userId: string) {
  try {
    return await syncLinkedPersonAchievements(userId);
  } catch {
    console.error("Person achievement synchronization failed after canonical activity.");
    return null;
  }
}

export async function safelySyncLinkedPersonAchievementsByLogin(twitchLogin: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { twitchLogin },
      select: { id: true },
    });
    return user ? await syncLinkedPersonAchievements(user.id) : null;
  } catch {
    console.error("Person achievement synchronization failed after canonical activity.");
    return null;
  }
}
