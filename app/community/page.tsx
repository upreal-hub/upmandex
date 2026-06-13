import Link from "next/link";

export default function CommunityPage() {
  const collectors = [
    {
      name: "upreal_",
      count: 24,
    },
    {
      name: "Darling Beanie",
      count: 17,
    },
    {
      name: "Lupus323",
      count: 8,
    },
    {
      name: "ChefRossi",
      count: 6,
    },
    {
      name: "NuttellaCafe",
      count: 4,
    },
  ];

  const top3 = collectors.slice(0, 3);

  return (
    <main className="min-h-screen bg-slate-900 text-white p-8">

      <h1 className="text-5xl font-bold mb-10">
        👥 Community Collections
      </h1>

      <p className="opacity-70 mb-8">
        The greatest Upman collectors.
      </p>

      {/* Top 3 */}
      <div className="grid grid-cols-3 gap-6 mb-10">

        {top3.map((collector, index) => (
          <Link
            key={collector.name}
            href={`/community/${encodeURIComponent(
              collector.name
            )}`}
          >
            <div className="border border-slate-700 rounded-lg p-6 text-center hover:border-green-500 transition duration-200 cursor-pointer">

              <div className="text-4xl mb-2">
                {index === 0
                  ? "🥇"
                  : index === 1
                  ? "🥈"
                  : "🥉"}
              </div>

              <h2 className="text-2xl font-bold">
                {collector.name}
              </h2>

              <p className="opacity-70 mt-2">
                {collector.count} Upmans
              </p>

            </div>
          </Link>
        ))}

      </div>

      {/* Ranking */}
      <div className="space-y-4">

        {collectors.map((collector, index) => {

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
              key={collector.name}
              href={`/community/${encodeURIComponent(
                collector.name
              )}`}
            >
              <div className="border border-slate-700 rounded-lg p-6 flex justify-between items-center hover:border-green-500 transition duration-200 cursor-pointer">

                <h2 className="text-2xl font-bold">
                  {medal} {collector.name}
                </h2>

                <div className="text-xl font-bold">
                  {collector.count} Upmans
                </div>

              </div>
            </Link>
          );
        })}

      </div>

    </main>
  );
}