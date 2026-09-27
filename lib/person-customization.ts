import "server-only";

import { getAchievementCosmetic, getAchievementDefinition, type CosmeticSlot } from "@/lib/achievements";
import { prisma } from "@/lib/prisma";

export type PersonCosmeticLoadout = {
  equippedTitleAchievementKey: string | null;
  equippedBackgroundAchievementKey: string | null;
  equippedBannerAchievementKey: string | null;
  equippedAccentAchievementKey: string | null;
  featuredAchievementKeys: string[];
};

export class PersonCustomizationError extends Error {
  constructor(public readonly status: 403 | 404 | 400, message: string) {
    super(message);
  }
}

type CosmeticLoadoutKey = Exclude<keyof PersonCosmeticLoadout, "featuredAchievementKeys">;

const cosmeticSlots: Array<[CosmeticSlot, CosmeticLoadoutKey]> = [
  ["title", "equippedTitleAchievementKey"],
  ["background", "equippedBackgroundAchievementKey"],
  ["banner", "equippedBannerAchievementKey"],
  ["accent", "equippedAccentAchievementKey"],
];

/** The single authoritative write path for an owner's achievement cosmetic loadout. */
export async function updatePersonCosmeticLoadout(personId: string, userId: string, loadout: PersonCosmeticLoadout) {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { userId: true },
  });
  if (!person) throw new PersonCustomizationError(404, "Person not found");
  if (person.userId !== userId) throw new PersonCustomizationError(403, "You can only customize your own profile");

  const selectedKeys = new Set<string>();
  for (const [, property] of cosmeticSlots) {
    const key = loadout[property];
    if (typeof key === "string") selectedKeys.add(key);
  }
  for (const key of loadout.featuredAchievementKeys) selectedKeys.add(key);

  for (const key of selectedKeys) {
    if (!getAchievementDefinition(key)) {
      throw new PersonCustomizationError(400, "Choose only known achievements");
    }
  }

  for (const [slot, property] of cosmeticSlots) {
    const key = loadout[property];
    if (key && !getAchievementCosmetic(key, slot)) {
      throw new PersonCustomizationError(400, "That achievement does not provide this cosmetic");
    }
  }

  const unlocked = await prisma.personAchievement.findMany({
    where: { personId, achievementKey: { in: [...selectedKeys] } },
    select: { achievementKey: true },
  });
  if (unlocked.length !== selectedKeys.size) {
    throw new PersonCustomizationError(400, "Choose only unlocked achievements");
  }

  return prisma.person.update({
    where: { id: personId },
    data: loadout,
    select: {
      equippedTitleAchievementKey: true,
      equippedBackgroundAchievementKey: true,
      equippedBannerAchievementKey: true,
      equippedAccentAchievementKey: true,
      featuredAchievementKeys: true,
    },
  });
}
