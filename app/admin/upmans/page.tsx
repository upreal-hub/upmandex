import { prisma } from "@/lib/prisma";

import UpmanManager from "./UpmanManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminUpmansPage() {
  const upmans = await prisma.upman.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      image: true,
      rarity: true,
      creator: true,
      creatorTwitch: true,
      ownersCount: true,
      firstOwner: true,
      createdAt: true,
    },
  });

  return <UpmanManager upmans={upmans} />;
}
