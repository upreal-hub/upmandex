import { prisma } from "@/lib/prisma";
import { getCreatorAssociationStatus } from "@/lib/upman-identity";

import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const [totalUpmans, totalUsers, totalPeople, totalDiscoveries, rarityCounts, relationshipUpmans, latestUpman, recentActivity] =
    await Promise.all([
      prisma.upman.count(),
      prisma.user.count(),
      prisma.person.count(),
      prisma.inventory.count(),
      prisma.upman.groupBy({ by: ["rarity"], _count: { _all: true }, orderBy: { rarity: "asc" } }),
      prisma.upman.findMany({
        select: {
          rarity: true, creator: true, creatorTwitch: true,
          creatorPerson: { select: { id: true, displayName: true, isPublic: true, user: { select: { twitchLogin: true, avatar: true } } } },
          representedPersonId: true,
        },
      }),
      prisma.upman.findFirst({
        orderBy: { createdAt: "desc" },
        select: {
          name: true,
          image: true,
          rarity: true,
          creator: true,
          createdAt: true,
        },
      }),
      prisma.activityLog.findMany({
        take: 5,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          action: true,
          origin: true,
          actorLogin: true,
          targetLogin: true,
          upmanName: true,
          upmanSlug: true,
          personDisplayName: true,
          createdAt: true,
        },
      }),
    ]);

  const possibleDiscoveries = totalUsers * totalUpmans;
  const globalCompletion =
    possibleDiscoveries > 0
      ? (totalDiscoveries / possibleDiscoveries) * 100
      : 0;
  const missingRepresentedPeople = relationshipUpmans.filter((upman) => upman.rarity !== "Common" && !upman.representedPersonId).length;
  const mismatchCount = relationshipUpmans.filter((upman) => getCreatorAssociationStatus(upman, upman.creatorPerson) === "Mismatch").length;
  const canonicalCreators = new Set(relationshipUpmans.map((upman) => upman.creatorPerson?.id).filter(Boolean)).size;

  return (
    <AdminDashboard
      data={{
        totalUpmans,
        totalUsers,
        totalPeople,
        totalDiscoveries,
        globalCompletion,
        rarityCounts: rarityCounts.map((entry) => ({ rarity: entry.rarity, count: entry._count._all })),
        canonicalCreators,
        missingRepresentedPeople,
        mismatchCount,
        latestUpman,
        recentActivity,
      }}
    />
  );
}
