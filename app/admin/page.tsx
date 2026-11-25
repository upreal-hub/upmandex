import { auth } from "@/auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isReleaseOwner } from "@/lib/site-publication-policy";
import { getCreatorAssociationStatus } from "@/lib/upman-identity";

import AdminDashboard from "./AdminDashboard";
import ReleaseControl from "./ReleaseControl";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const session = await auth();
  const showRelease = isReleaseOwner(session?.user?.twitchUserId, process.env.UPMANDEX_RELEASE_ADMIN_TWITCH_ID);
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
    <>{showRelease && <>
      <Link href="/admin/twitch-commands" className="mb-4 mr-2 inline-block rounded-xl bg-sky-900 px-4 py-2 font-bold text-white">Twitch Commands</Link>
      <Link href="/admin/gartic-feud" className="mb-4 inline-block rounded-xl bg-sky-900 px-4 py-2 font-bold text-white">
        Gartic Feud
      </Link>
      <ReleaseControl />
    </>}<AdminDashboard
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
    /></>
  );
}
