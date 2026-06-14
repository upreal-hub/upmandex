import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function UpmanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const upmans =
    await prisma.upman.findMany({
      orderBy: {
        name: "asc",
      },
    });

  const upman =
    upmans.find(
      (u) => u.slug === slug
    );

  if (!upman) {
    return (
      <main className="text-center py-20">
        <h1 className="text-5xl font-black text-sky-800">
          Lost in the Clouds ☁️
        </h1>

        <p className="mt-4 text-sky-600">
          This creature could not be found.
        </p>
      </main>
    );
  }

  const dexNumber =
    upmans.findIndex(
      (u) => u.slug === upman.slug
    ) + 1;

  const currentIndex =
    upmans.findIndex(
      (u) => u.slug === upman.slug
    );

  const previousUpman =
    currentIndex > 0
      ? upmans[currentIndex - 1]
      : null;

  const nextUpman =
    currentIndex <
    upmans.length - 1
      ? upmans[currentIndex + 1]
      : null;

  const otherCreations =
    upmans.filter(
      (u) =>
        u.creator ===
          upman.creator &&
        u.slug !== upman.slug
    );

  const creatorCount =
    upmans.filter(
      (u) =>
        u.creator ===
        upman.creator
    ).length;

  const rarityColor = {
    Common: "text-green-500",
    Rare: "text-blue-500",
    Epic: "text-purple-500",
    Mythic: "text-red-500",
    Legendary: "text-yellow-500",
  }[
    upman.rarity as
      | "Common"
      | "Rare"
      | "Epic"
      | "Mythic"
      | "Legendary"
  ];

  return (
    <main>

      <Link
        href="/upmans"
        className="text-sky-600 hover:text-sky-400 transition"
      >
        ← Return to the Skylands
      </Link>

      <div className="text-center mt-12">

        <p className="uppercase tracking-[0.3em] text-sky-500 text-sm">
          ☁️ Skylands Creature
        </p>

        <p className="text-sky-500 mt-2">
          #
          {dexNumber
            .toString()
            .padStart(3, "0")}
        </p>

        <h1 className="text-6xl font-black text-sky-800 mt-4">
          {upman.name}
        </h1>

      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-[40px] shadow-2xl p-10 mt-10 max-w-4xl mx-auto">

        <img
          src={upman.image}
          alt={upman.name}
          className="w-72 h-72 object-contain mx-auto"
        />

        <p
          className={`text-center text-2xl font-black mt-6 ${rarityColor}`}
        >
          {upman.rarity} Creature
        </p>

        <div className="text-center mt-8 space-y-3">

          <p className="text-sky-700">
            ☁️ Cloud Artist
          </p>

          <p className="font-bold text-sky-900">
            {upman.creator}
          </p>

          {upman.firstOwner && (
            <>
              <p className="text-sky-700 pt-4">
                👑 First Explorer
              </p>

              <p className="font-bold text-sky-900">
                {upman.firstOwner}
              </p>
            </>
          )}

          {upman.ownersCount > 0 && (
            <p className="text-sky-700 pt-4">
              👥 Discovered by{" "}
              {upman.ownersCount}
              {upman.ownersCount > 1
                ? "s"
                : ""}
            </p>
          )}

          <p className="text-sky-700 pt-4">
            🎨 Artist Collection
          </p>

          <p className="font-bold text-sky-900">
            {creatorCount} creation
            {creatorCount > 1
              ? "s"
              : ""}
          </p>

        </div>

      </div>

      {otherCreations.length > 0 && (
        <>
          <h2 className="text-4xl font-black text-sky-800 text-center mt-20 mb-10">

            More Creatures by{" "}
            {upman.creator}

          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">

            {otherCreations.map(
              (other) => (
                <Link
                  key={other.slug}
                  href={`/upmans/${other.slug}`}
                >
                  <div className="bg-white/80 rounded-3xl shadow-xl p-4 hover:-translate-y-1 transition">

                    <img
                      src={other.image}
                      alt={other.name}
                      className="w-24 h-24 object-contain mx-auto"
                    />

                    <p className="text-center font-bold mt-3 text-sky-800">
                      {other.name}
                    </p>

                  </div>
                </Link>
              )
            )}

          </div>
        </>
      )}

      <div className="flex justify-between mt-16">

        <div>
          {previousUpman && (
            <Link
              href={`/upmans/${previousUpman.slug}`}
              className="text-sky-600 hover:text-sky-400"
            >
              ← {previousUpman.name}
            </Link>
          )}
        </div>

        <div>
          {nextUpman && (
            <Link
              href={`/upmans/${nextUpman.slug}`}
              className="text-sky-600 hover:text-sky-400"
            >
              {nextUpman.name} →
            </Link>
          )}
        </div>

      </div>

    </main>
  );
}