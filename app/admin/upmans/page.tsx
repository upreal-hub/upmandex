import { prisma } from "@/lib/prisma";
import { getActiveEventUpmanConfig } from "@/lib/active-event-upman";

import UpmanManager from "./UpmanManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminUpmansPage() {
  const [upmans, people, eventUpmans, eventConfig] = await Promise.all([
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
    prisma.upman.findMany({
      where: { rarity: "Event" },
      orderBy: [{ name: "asc" }, { slug: "asc" }],
      select: { id: true, slug: true, name: true },
    }),
    getActiveEventUpmanConfig(),
  ]);

  return <UpmanManager upmans={upmans} people={people} eventUpmans={eventUpmans} eventConfig={eventConfig} />;
}
