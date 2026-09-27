import { prisma } from "@/lib/prisma";

import PeopleManager from "./PeopleManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPeoplePage() {
  const [people, users] = await Promise.all([
    prisma.person.findMany({
      orderBy: [{ displayName: "asc" }, { id: "asc" }],
      select: {
        id: true,
        displayName: true,
        userId: true,
        isPublic: true,
        equippedTitleAchievementKey: true,
        featuredAchievementKeys: true,
        user: { select: { id: true, twitchLogin: true, displayName: true, avatar: true } },
        _count: { select: { createdUpmans: true, representedUpmans: true, achievements: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: [{ twitchLogin: "asc" }],
      select: {
        id: true,
        twitchLogin: true,
        displayName: true,
        avatar: true,
        person: { select: { id: true, displayName: true } },
      },
    }),
  ]);

  return (
    <PeopleManager
      people={people.map((person) => ({
        id: person.id,
        displayName: person.displayName,
        userId: person.userId,
        isPublic: person.isPublic,
        user: person.user,
        createdUpmansCount: person._count.createdUpmans,
        representedUpmansCount: person._count.representedUpmans,
        achievementsCount: person._count.achievements,
        hasEquippedTitle: Boolean(person.equippedTitleAchievementKey),
        featuredAchievementsCount: person.featuredAchievementKeys.length,
      }))}
      users={users.map((user) => ({
        id: user.id,
        twitchLogin: user.twitchLogin,
        displayName: user.displayName,
        avatar: user.avatar,
        linkedPerson: user.person,
      }))}
    />
  );
}
