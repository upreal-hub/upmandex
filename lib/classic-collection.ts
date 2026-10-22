import type { Prisma } from "@/app/generated/prisma/client";
import { PULL_RARITIES } from "@/lib/upman-rarity";

/**
 * The achievement collection: the public catalogue that can be earned through
 * the normal weighted pull system. Event, Secret, Hidden, and non-pullable
 * Upmans are intentionally outside this completion goal.
 */
export const classicCollectionUpmanWhere = {
  dexVisibility: "PUBLIC",
  isPullable: true,
  rarity: { in: [...PULL_RARITIES] },
} satisfies Prisma.UpmanWhereInput;

export function isClassicCollectionUpman(upman: {
  dexVisibility: string;
  isPullable: boolean;
  rarity: string;
}) {
  return (
    upman.dexVisibility === "PUBLIC" &&
    upman.isPullable &&
    PULL_RARITIES.includes(upman.rarity as (typeof PULL_RARITIES)[number])
  );
}
