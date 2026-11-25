import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

import RelationshipManager from "./RelationshipManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UpmanRelationshipsPage() {
  const authorization = await requireAdmin();
  if (!authorization.ok) redirect("/");
  const [upmans, people, users] = await Promise.all([
    prisma.upman.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true, slug: true, name: true, image: true, rarity: true, creator: true, creatorTwitch: true,
        creatorPerson: { select: { id: true, displayName: true } },
        representedPerson: { select: { id: true, displayName: true } },
      },
    }),
    prisma.person.findMany({
      orderBy: [{ displayName: "asc" }, { id: "asc" }],
      select: { id: true, displayName: true, userId: true, user: { select: { twitchLogin: true } } },
    }),
    prisma.user.findMany({
      orderBy: [{ twitchLogin: "asc" }],
      select: {
        id: true, twitchUserId: true, twitchLogin: true, displayName: true, avatar: true,
        person: { select: { id: true, displayName: true } },
      },
    }),
  ]);

  return <RelationshipManager upmans={upmans} people={people} users={users} />;
}
