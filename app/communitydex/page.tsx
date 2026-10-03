import { prisma } from "@/lib/prisma";
import { publicUpmanWhere } from "@/lib/upman-visibility";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CommunityDexPage() {
  const upmans = await prisma.upman.findMany({
    where: publicUpmanWhere,
    orderBy: [{ createdAt: "desc" }, { slug: "asc" }],
    select: {
      name: true,
      rarity: true,
      creator: true,
    },
  });

  const totalUpmans = upmans.length;

  const totalCreators = new Set(
    upmans.map((u) => u.creator)
  ).size;

  const commonCount = upmans.filter(
    (u) => u.rarity === "Common"
  ).length;

  const rareCount = upmans.filter(
    (u) => u.rarity === "Rare"
  ).length;

  const epicCount = upmans.filter(
    (u) => u.rarity === "Epic"
  ).length;

  const mythicCount = upmans.filter(
    (u) => u.rarity === "Mythic"
  ).length;

  const legendaryCount = upmans.filter(
    (u) => u.rarity === "Legendary"
  ).length;

  const secretCount = upmans.filter(
    (u) => u.rarity === "Secret"
  ).length;

  const eventCount = upmans.filter(
    (u) => u.rarity === "Event"
  ).length;

  const ranking = [...new Set(upmans.map((u) => u.creator))]
    .map((creator) => ({
      creator,
      count: upmans.filter(
        (u) => u.creator === creator
      ).length,
    }))
    .sort((a, b) => b.count - a.count);

  const topCreator = ranking[0];

  const latestUpman = upmans[0];

  return (
    <main className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-5xl font-bold mb-10">
        🌍 Community Dex
      </h1>

      <div className="grid grid-cols-3 gap-6">

        <div className="border border-slate-700 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">
            📚 Collection
          </h2>

          <p>Total Upmans: {totalUpmans}</p>
          <p>Total Creators: {totalCreators}</p>
        </div>

        <div className="border border-slate-700 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">
            🏆 Creator Champion
          </h2>

          <p className="text-xl">
            {topCreator?.creator ?? "—"}
          </p>

          <p className="opacity-70">
            {topCreator?.count ?? 0} creations
          </p>
        </div>

        <div className="border border-slate-700 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">
            🆕 Latest Upman
          </h2>

          <p className="text-xl">
            {latestUpman?.name ?? "—"}
          </p>

          <p className="opacity-70">
            #{upmans.length
              .toString()
              .padStart(3, "0")}
          </p>
        </div>

      </div>

      <h2 className="text-3xl font-bold mt-12 mb-6">
        Rarity Distribution
      </h2>

      <div className="grid grid-cols-5 gap-6">

        <div className="border border-green-500 rounded-lg p-6 text-center">
          <h3 className="font-bold text-green-400">
            Common
          </h3>
          <p className="text-3xl mt-2">
            {commonCount}
          </p>
        </div>

        <div className="border border-blue-500 rounded-lg p-6 text-center">
          <h3 className="font-bold text-blue-400">
            Rare
          </h3>
          <p className="text-3xl mt-2">
            {rareCount}
          </p>
        </div>

        <div className="border border-purple-500 rounded-lg p-6 text-center">
          <h3 className="font-bold text-purple-400">
            Epic
          </h3>
          <p className="text-3xl mt-2">
            {epicCount}
          </p>
        </div>

        <div className="border border-red-500 rounded-lg p-6 text-center">
          <h3 className="font-bold text-red-400">
            Mythic
          </h3>
          <p className="text-3xl mt-2">
            {mythicCount}
          </p>
        </div>

        <div className="border border-yellow-500 rounded-lg p-6 text-center">
          <h3 className="font-bold text-yellow-400">
            Legendary
          </h3>
          <p className="text-3xl mt-2">
            {legendaryCount}
          </p>
        </div>

        {secretCount > 0 && <div className="border border-cyan-400 rounded-lg bg-gradient-to-br from-cyan-400/20 to-rose-400/20 p-6 text-center">
          <h3 className="font-bold text-cyan-300">
            Secret
          </h3>
          <p className="text-3xl mt-2">
            {secretCount}
          </p>
        </div>
        }

        {eventCount > 0 && <div className="border border-pink-300 rounded-lg bg-gradient-to-br from-pink-300/30 to-white/30 p-6 text-center">
          <h3 className="font-bold text-pink-300">EVENT</h3>
          <p className="text-3xl mt-2">{eventCount}</p>
        </div>}

      </div>
    </main>
  );
}
