import { prisma } from "@/lib/prisma";

import UpmanManager from "./UpmanManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminUpmansPage() {
  const [upmans, people] = await Promise.all([
    prisma.upman.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      image: true,
      rarity: true,
      creator: true,
      creatorTwitch: true,
      creatorPersonId: true,
      representedPersonId: true,
      creatorPerson: { select: { id: true, displayName: true } },
      representedPerson: { select: { id: true, displayName: true } },
      ownersCount: true,
      firstOwner: true,
      createdAt: true,
    },
    }),
    prisma.person.findMany({
      orderBy: [{ displayName: "asc" }, { id: "asc" }],
      select: { id: true, displayName: true },
    }),
  ]);

  return <UpmanManager upmans={upmans} people={people} />;
}
