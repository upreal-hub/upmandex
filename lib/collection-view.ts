import "server-only";

import type { CollectionEntry } from "@/components/CollectionGallery";
import { prisma } from "@/lib/prisma";
import { collectionUpmanWhere } from "@/lib/upman-visibility";

export async function getCollectionView(userId: string, canViewOwnedHidden: boolean) {
  const visibleWhere = collectionUpmanWhere(userId, canViewOwnedHidden);
  const [inventory, upmans] = await Promise.all([
    prisma.inventory.findMany({ where: { userId, upman: visibleWhere }, select: { upmanId: true } }),
    prisma.upman.findMany({ where: visibleWhere, orderBy: [{ name: "asc" }, { slug: "asc" }], select: { id: true, slug: true, name: true, image: true, rarity: true, creator: true, creatorTwitch: true } }),
  ]);
  const creatorLogins = upmans.map((upman) => upman.creatorTwitch).filter((login): login is string => Boolean(login));
  const creators = creatorLogins.length ? await prisma.user.findMany({ where: { twitchLogin: { in: creatorLogins } }, select: { twitchLogin: true, avatar: true } }) : [];
  const avatars = new Map(creators.map((creator) => [creator.twitchLogin, creator.avatar]));
  const owned = new Set(inventory.map((entry) => entry.upmanId));
  const entries: CollectionEntry[] = upmans.map((upman) => ({
    ...upman,
    rarity: upman.rarity as CollectionEntry["rarity"],
    creatorAvatar: upman.creatorTwitch ? avatars.get(upman.creatorTwitch) ?? null : null,
    owned: owned.has(upman.id),
    canViewDetails: true,
  }));
  return { entries, ownedCount: entries.filter((entry) => entry.owned).length };
}
