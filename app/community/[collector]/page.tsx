import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";
import { collectionUpmanWhere, publicInventoryWhere } from "@/lib/upman-visibility";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ collector: string }>;
};

export default async function CollectorPage({ params }: Props) {
  const { collector } = await params;
  const requestedCollector = decodeURIComponent(collector);
  const normalizedLogin = requestedCollector.trim().toLowerCase();
  const visitorLogin = normalizeTwitchLogin((await auth())?.user?.name);

  let user = await prisma.user.findUnique({
    where: { twitchLogin: normalizedLogin },
    select: { id: true, twitchLogin: true, displayName: true },
  });

  if (!user) {
    user = await prisma.user.findFirst({
      where: {
        displayName: {
          equals: requestedCollector,
          mode: "insensitive",
        },
      },
      select: { id: true, twitchLogin: true, displayName: true },
    });
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-900 text-white p-8">
        <h1>Collector not found 😢</h1>
      </main>
    );
  }

  const visitor = visitorLogin
    ? await prisma.user.findUnique({ where: { twitchLogin: visitorLogin }, select: { id: true } })
    : null;
  const isOwner = visitor?.id === user.id;
  const visibleUpmanWhere = collectionUpmanWhere(user.id, isOwner);

  const [totalUpmans, collectors, visibleInventory] = await Promise.all([
    prisma.upman.count({ where: visibleUpmanWhere }),
    prisma.user.findMany({
    select: {
      id: true,
      displayName: true,
      _count: { select: { inventory: { where: publicInventoryWhere } } },
    },
    }),
    prisma.inventory.findMany({
      where: { userId: user.id, upman: visibleUpmanWhere },
      include: { upman: true },
      orderBy: { obtainedAt: "asc" },
    }),
  ]);

  const ranking = collectors
    .sort(
      (a, b) =>
        b._count.inventory - a._count.inventory ||
        a.displayName.localeCompare(b.displayName)
    );
  const rank = ranking.findIndex((entry) => entry.id === user.id) + 1;

  const collectedUpmans = visibleInventory.map((item) => item.upman);
  const ownedCount = collectedUpmans.length;
  const completion = totalUpmans > 0
    ? Math.round((ownedCount / totalUpmans) * 100)
    : 0;

  const legendaryCount = collectedUpmans.filter(
    (upman) => upman.rarity === "Legendary"
  ).length;
  const mythicCount = collectedUpmans.filter(
    (upman) => upman.rarity === "Mythic"
  ).length;

  const badges: string[] = [];
  if (legendaryCount >= 1) {
    badges.push("👑 Legendary Collector");
  }
  if (mythicCount >= 1) {
    badges.push("🔥 Mythic Hunter");
  }
  if (ownedCount >= 20) {
    badges.push("🏅 Upman Veteran");
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white p-8">

      <Link
        href="/community"
        className="text-blue-400 hover:underline"
      >
        ← Back to Community
      </Link>

      <h1 className="text-5xl font-bold mt-8">
        👤 {user.displayName}
      </h1>

      <p className="opacity-70 mt-2">
        {ownedCount} Upmans
      </p>

      <p className="mt-2">
        {completion}% Complete
      </p>

      <p className="mt-2 font-bold">
        🏆 #{rank} Collector
      </p>

      {badges.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">

          {badges.map((badge) => (
            <div
              key={badge}
              className="border border-yellow-500 rounded-lg px-3 py-2"
            >
              {badge}
            </div>
          ))}

        </div>
      )}

      <hr className="my-10 border-slate-700" />

      <h2 className="text-3xl font-bold mb-6">
        Collection
      </h2>

      <div className="grid grid-cols-4 gap-6">

        {collectedUpmans.map((upman) => {

          const rarityColor =
            upman.rarity === "Common"
              ? "border-green-500"
              : upman.rarity === "Rare"
              ? "border-blue-500"
              : upman.rarity === "Epic"
              ? "border-purple-500"
              : upman.rarity === "Mythic"
              ? "border-red-500"
              : upman.rarity === "Secret"
              ? "border-cyan-400 shadow-[0_0_20px_rgba(53,230,230,0.25)]"
              : upman.rarity === "Event"
              ? "border-pink-300 shadow-[0_0_20px_rgba(255,122,200,0.25)]"
              : "border-yellow-500";

          const card = (
              <div
                className={`border-2 ${rarityColor} rounded-lg p-4 hover:scale-105 transition duration-200 cursor-pointer`}
              >
                <img
                  src={upman.image}
                  alt={upman.name}
                  className="w-24 h-24 object-contain mx-auto"
                />

                <p className="text-center mt-2 font-bold">
                  {upman.name}
                </p>

                <p className="text-center text-sm opacity-70">
                  {upman.rarity === "Event" ? "EVENT" : upman.rarity}
                </p>
              </div>
          );

          return <Link key={upman.slug} href={`/upmans/${upman.slug}`}>{card}</Link>;
        })}

      </div>

    </main>
  );
}
