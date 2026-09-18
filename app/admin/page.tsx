import { prisma } from "@/lib/prisma";

import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const [totalUpmans, totalUsers, totalDiscoveries, latestUpman] =
    await Promise.all([
      prisma.upman.count(),
      prisma.user.count(),
      prisma.inventory.count(),
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
    ]);

  const possibleDiscoveries = totalUsers * totalUpmans;
  const globalCompletion =
    possibleDiscoveries > 0
      ? (totalDiscoveries / possibleDiscoveries) * 100
      : 0;

  return (
    <AdminDashboard
      data={{
        totalUpmans,
        totalUsers,
        totalDiscoveries,
        globalCompletion,
        latestUpman,
      }}
    />
  );
}
