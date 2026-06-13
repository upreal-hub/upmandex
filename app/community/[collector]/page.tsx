import Link from "next/link";
import { upmans } from "@/data/upmans";

export default async function CollectorPage({
  params,
}: {
  params: Promise<{ collector: string }>;
}) {
  const { collector } = await params;

  const collectors = {
    "upreal_": {
      count: 24,
      rank: 1,
      completion: 73,
      upmans: [
        "foxupman",
        "normalupman",
        "firfanupman",
        "personaupman",
        "cyclupman",
      ],
    },

    "Darling Beanie": {
      count: 17,
      rank: 2,
      completion: 52,
      upmans: [
        "beanieupman",
        "kittyupman",
        "foxupman",
      ],
    },

    "Lupus323": {
      count: 8,
      rank: 3,
      completion: 24,
      upmans: [
        "smoreupman",
        "normalupman",
      ],
    },
  };

  const profile =
    collectors[
      collector as keyof typeof collectors
    ];

  if (!profile) {
    return (
      <main className="min-h-screen bg-slate-900 text-white p-8">
        <h1>Collector not found 😢</h1>
      </main>
    );
  }

  const collectedUpmans = upmans.filter((u) =>
    profile.upmans.includes(u.slug)
  );

  const legendaryCount = collectedUpmans.filter(
  (u) => u.rarity === "Legendary"
).length;

const mythicCount = collectedUpmans.filter(
  (u) => u.rarity === "Mythic"
).length;

const badges = [];

if (legendaryCount >= 1) {
  badges.push("👑 Legendary Collector");
}

if (mythicCount >= 1) {
  badges.push("🔥 Mythic Hunter");
}

if (profile.count >= 20) {
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
        👤 {collector}
      </h1>

      <p className="opacity-70 mt-2">
        {profile.count} Upmans
      </p>

      <p className="mt-2">
        {profile.completion}% Complete
      </p>

      <p className="mt-2 font-bold">
        🏆 #{profile.rank} Collector
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
              : "border-yellow-500";

          return (
            <Link
              key={upman.slug}
              href={`/upmans/${upman.slug}`}
            >
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
                  {upman.rarity}
                </p>
              </div>
            </Link>
          );
        })}

      </div>

    </main>
  );
}