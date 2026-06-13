import Link from "next/link";
import { upmans } from "@/data/upmans";

export default function PantheonPage() {
  const ranking = [...new Set(upmans.map((u) => u.creator))]
    .map((creator) => ({
      creator,
      count: upmans.filter(
        (u) => u.creator === creator
      ).length,
    }))
    .sort((a, b) => b.count - a.count);

  const top3 = ranking.slice(0, 3);

  return (
    <main className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-5xl font-bold mb-10">
        🏛 Pantheon
      </h1>

      <p className="opacity-70 mb-8">
        The greatest Upman creators of all time.
      </p>

      <div className="grid grid-cols-3 gap-6 mb-10">
        {top3.map((creator, index) => (
          <Link
            key={creator.creator}
            href={`/creators/${encodeURIComponent(
              creator.creator
            )}`}
          >
            <div className="border border-slate-700 rounded-lg p-6 text-center hover:border-yellow-500 transition duration-200 cursor-pointer">
              <div className="text-4xl mb-2">
                {index === 0
                  ? "🥇"
                  : index === 1
                  ? "🥈"
                  : "🥉"}
              </div>

              <h2 className="text-2xl font-bold">
                {creator.creator}
              </h2>

              <p className="opacity-70 mt-2">
                {creator.count} Upmans
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {ranking.map((creator, index) => {
          const medal =
            index === 0
              ? "🥇"
              : index === 1
              ? "🥈"
              : index === 2
              ? "🥉"
              : "🏅";

          return (
            <Link
              key={creator.creator}
              href={`/creators/${encodeURIComponent(
                creator.creator
              )}`}
            >
              <div className="border border-slate-700 rounded-lg p-6 flex justify-between items-center hover:border-yellow-500 transition duration-200 cursor-pointer">
                <h2 className="text-2xl font-bold">
                  {medal} {creator.creator}
                </h2>

                <div className="text-xl font-bold">
                  {creator.count} Upmans
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}