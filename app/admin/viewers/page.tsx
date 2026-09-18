import { prisma } from "@/lib/prisma";

import ViewerManager from "./ViewerManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminViewersPage() {
  const [totalUpmans, users, inventoryByUser] = await Promise.all([
    prisma.upman.count(),
    prisma.user.findMany({
      select: {
        id: true,
        twitchLogin: true,
        displayName: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
      orderBy: { displayName: "asc" },
    }),
    prisma.inventory.groupBy({
      by: ["userId"],
      _count: { _all: true },
      _max: { obtainedAt: true },
    }),
  ]);

  const inventoryStats = new Map(
    inventoryByUser.map((entry) => [
      entry.userId,
      {
        ownedCount: entry._count._all,
        latestDiscoveryAt: entry._max.obtainedAt,
      },
    ])
  );

  const viewers = users.map((user) => {
    const stats = inventoryStats.get(user.id);
    const ownedCount = stats?.ownedCount ?? 0;

    return {
      ...user,
      ownedCount,
      completion: totalUpmans > 0 ? (ownedCount / totalUpmans) * 100 : 0,
      latestDiscoveryAt: stats?.latestDiscoveryAt ?? null,
    };
  });

  return <ViewerManager viewers={viewers} totalUpmans={totalUpmans} />;
}
