import { upmans } from "@/data/upmans";
import UpmanCard from "@/components/UpmanCard";
import { readFile } from "fs/promises";
import path from "path";

type Props = {
  params: Promise<{
    viewer: string;
  }>;
};

export default async function ViewerCollection({
  params,
}: Props) {
  const { viewer } =
    await params;

  const filePath = path.join(
    process.cwd(),
    "data",
    "inventories.json"
  );

  const content =
    await readFile(
      filePath,
      "utf8"
    );

  const inventories =
    JSON.parse(content);

  const inventory =
    inventories[viewer] ?? {
      upmans: [],
    };

  const ownedUpmans =
    inventory.upmans
      .map(
        (
          item: {
            slug: string;
          }
        ) =>
          upmans.find(
            (u) =>
              u.slug ===
              item.slug
          )
      )
      .filter(Boolean);

  const totalUpmans =
    upmans.length;

  const ownedCount =
    ownedUpmans.length;

  const completion =
    totalUpmans > 0
      ? (
          (ownedCount /
            totalUpmans) *
          100
        ).toFixed(1)
      : "0";

  const commonCount =
    ownedUpmans.filter(
      (u: any) =>
        u.rarity ===
        "Common"
    ).length;

  const rareCount =
    ownedUpmans.filter(
      (u: any) =>
        u.rarity ===
        "Rare"
    ).length;

  const epicCount =
    ownedUpmans.filter(
      (u: any) =>
        u.rarity ===
        "Epic"
    ).length;

  const mythicCount =
    ownedUpmans.filter(
      (u: any) =>
        u.rarity ===
        "Mythic"
    ).length;

  const legendaryCount =
    ownedUpmans.filter(
      (u: any) =>
        u.rarity ===
        "Legendary"
    ).length;

  const latestDiscovery =
    ownedUpmans[
      ownedUpmans.length - 1
    ];

  return (
    <main>

      {/* Hero */}

      <div
        className="
          bg-white/80
          backdrop-blur-md
          rounded-[40px]
          shadow-2xl
          p-10
          mb-12
        "
      >

        <div className="flex flex-col md:flex-row items-center justify-between gap-8">

          <div className="flex items-center gap-6">

            <div
              className="
                w-28
                h-28
                rounded-full
                bg-sky-100
                flex
                items-center
                justify-center
                text-5xl
              "
            >
              👤
            </div>

            <div>

              <p className="uppercase tracking-[0.3em] text-sky-500 text-sm">
                ☁️ Explorer Profile
              </p>

              <h1 className="text-5xl font-black text-sky-800 mt-2">
                {viewer}
              </h1>

              <p className="text-sky-600 mt-2">
                {ownedCount} discoveries
              </p>

            </div>

          </div>

          <div className="text-center">

            <p className="text-4xl font-black text-sky-800">
              {completion}%
            </p>

            <p className="text-sky-600">
              Collection Complete
            </p>

          </div>

        </div>

        <div className="mt-8">

          <div className="w-full h-5 bg-sky-100 rounded-full overflow-hidden">

            <div
              className="
                h-full
                bg-sky-400
                rounded-full
              "
              style={{
                width: `${completion}%`,
              }}
            />

          </div>

        </div>

      </div>

      {/* Stats */}

      <div className="grid md:grid-cols-3 gap-6 mb-12">

        <div className="bg-white/80 rounded-3xl shadow-xl p-6">

          <p className="text-sky-500">
            ✨ Latest Discovery
          </p>

          <p className="font-black text-sky-800 mt-2">
            {latestDiscovery?.name ??
              "None"}
          </p>

        </div>

        <div className="bg-white/80 rounded-3xl shadow-xl p-6">

          <p className="text-sky-500">
            👑 Legendary
          </p>

          <p className="font-black text-sky-800 mt-2">
            {legendaryCount}
          </p>

        </div>

        <div className="bg-white/80 rounded-3xl shadow-xl p-6">

          <p className="text-sky-500">
            🔥 Mythic
          </p>

          <p className="font-black text-sky-800 mt-2">
            {mythicCount}
          </p>

        </div>

      </div>

      {/* Rarity Distribution */}

      <div className="bg-white/80 rounded-3xl shadow-xl p-6 mb-12">

        <h2 className="text-2xl font-black text-sky-800 mb-4">
          🌈 Collection Breakdown
        </h2>

        <div className="flex flex-wrap gap-6">

          <span className="text-green-500">
            🌿 {commonCount} Common
          </span>

          <span className="text-blue-500">
            💎 {rareCount} Rare
          </span>

          <span className="text-purple-500">
            💜 {epicCount} Epic
          </span>

          <span className="text-red-500">
            🔥 {mythicCount} Mythic
          </span>

          <span className="text-yellow-500">
            ✨ {legendaryCount} Legendary
          </span>

        </div>

      </div>

      {/* Collection */}

      <h2 className="text-4xl font-black text-sky-800 mb-8">
        📦 Collection
      </h2>

      <div
        className="
          grid
          grid-cols-2
          md:grid-cols-3
          xl:grid-cols-5
          gap-6
        "
      >

        {ownedUpmans.map(
          (upman: any) => (
            <UpmanCard
              key={upman.slug}
              slug={upman.slug}
              name={upman.name}
              image={upman.image}
              rarity={upman.rarity}
            />
          )
        )}

      </div>

    </main>
  );
}