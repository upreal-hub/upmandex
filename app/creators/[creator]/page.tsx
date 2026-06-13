import Link from "next/link";
import { upmans } from "@/data/upmans";

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const { creator } = await params;

  const creatorName = decodeURIComponent(creator);

  const creatorUpmans = upmans.filter(
    (u) => u.creator === creatorName
  );

  if (creatorUpmans.length === 0) {
    return (
      <main className="min-h-screen bg-slate-900 text-white p-8">
        <h1>Creator not found 😢</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white p-8">
      <Link
        href="/pantheon"
        className="text-blue-400 hover:underline"
      >
        ← Back to Pantheon
      </Link>

      <h1 className="text-5xl font-bold mt-8">
        🎨 {creatorName}
      </h1>

      <p className="opacity-70 mt-2 mb-10">
        {creatorUpmans.length} creation
        {creatorUpmans.length > 1 ? "s" : ""}
      </p>

      <div className="grid grid-cols-5 gap-6">
        {creatorUpmans.map((upman) => (
          <Link
            key={upman.slug}
            href={`/upmans/${upman.slug}`}
          >
            <div className="border border-slate-700 rounded-lg p-4 hover:scale-105 transition duration-200">
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
        ))}
      </div>
    </main>
  );
}