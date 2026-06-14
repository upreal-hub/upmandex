import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function HallOfFamePage() {
  const upmans =
    await prisma.upman.findMany();

  const topCreators = [
    ...new Set(
      upmans.map(
        (u) => u.creator
      )
    ),
  ]
    .map((creator) => ({
      creator,
      count: upmans.filter(
        (u) =>
          u.creator === creator
      ).length,
    }))
    .sort(
      (a, b) =>
        b.count - a.count
    );

  const mostOwned =
    [...upmans]
      .sort(
        (a, b) =>
          b.ownersCount -
          a.ownersCount
      )
      .slice(0, 10);

  const firstOwners =
    upmans.filter(
      (u) => u.firstOwner
    );

  return (
    <main>

      <div className="text-center mb-16">

        <p className="uppercase tracking-[0.3em] text-sky-500 text-sm">
          ☁️ Skylands Legends ☁️
        </p>

        <h1 className="text-6xl md:text-7xl font-black text-sky-800 mt-4">
          Cloud Pantheon
        </h1>

        <p className="text-sky-600 mt-6 max-w-2xl mx-auto">
          The greatest artists,
          creatures and pioneers
          of the Skylands.
        </p>

      </div>

      <div className="space-y-20">

        {/* Cloud Artists */}

        <section>

          <h2 className="text-4xl font-black text-sky-800 mb-8">
            🎨 Cloud Artists
          </h2>

          <div className="grid md:grid-cols-2 gap-6">

            {topCreators.map(
              (
                creator,
                index
              ) => (

                <Link
                  key={creator.creator}
                  href={`/collections/${creator.creator}`}
                >

                  <div
                    className="
                      bg-white/80
                      backdrop-blur-md
                      rounded-3xl
                      shadow-xl
                      p-6
                      hover:-translate-y-1
                      transition
                    "
                  >

                    <div className="flex justify-between items-center">

                      <div>

                        <p className="text-3xl">

                          {index === 0
                            ? "🥇"
                            : index === 1
                            ? "🥈"
                            : index === 2
                            ? "🥉"
                            : "🏅"}

                        </p>

                        <p className="font-black text-sky-800 text-xl mt-2">
                          {creator.creator}
                        </p>

                        <p className="text-sky-600 mt-2">
                          {creator.count} creations
                        </p>

                      </div>

                      <div
                        className="
                          w-20
                          h-20
                          rounded-full
                          bg-sky-100
                          flex
                          items-center
                          justify-center
                          text-3xl
                        "
                      >
                        👤
                      </div>

                    </div>

                  </div>

                </Link>

              )
            )}

          </div>

        </section>

        {/* Most Discovered */}

        <section>

          <h2 className="text-4xl font-black text-sky-800 mb-8">
            🔥 Most Discovered Creatures
          </h2>

          <div className="grid md:grid-cols-2 gap-6">

            {mostOwned.map(
              (
                upman,
                index
              ) => (

                <Link
                  key={upman.slug}
                  href={`/upmans/${upman.slug}`}
                >

                  <div
                    className="
                      bg-white/80
                      backdrop-blur-md
                      rounded-3xl
                      shadow-xl
                      p-6
                      hover:-translate-y-1
                      transition
                    "
                  >

                    <div className="flex justify-between items-center">

                      <div>

                        <p className="text-3xl">

                          {index === 0
                            ? "🥇"
                            : index === 1
                            ? "🥈"
                            : index === 2
                            ? "🥉"
                            : "🏅"}

                        </p>

                        <p className="font-black text-sky-800 text-xl mt-2">
                          {upman.name}
                        </p>

                        <p className="text-sky-600 mt-2">
                          {upman.ownersCount} explorers
                        </p>

                      </div>

                      <img
                        src={upman.image}
                        alt={upman.name}
                        className="w-20 h-20 object-contain"
                      />

                    </div>

                  </div>

                </Link>

              )
            )}

          </div>

        </section>

        {/* Archive */}

        <section>

          <h2 className="text-2xl font-bold text-sky-700 mb-6">
            👑 First Explorers Archive
          </h2>

          <div className="grid md:grid-cols-2 gap-4">

            {firstOwners.map(
              (upman) => (

                <Link
                  key={upman.slug}
                  href={`/upmans/${upman.slug}`}
                >

                  <div
                    className="
                      bg-white/60
                      backdrop-blur-md
                      rounded-2xl
                      shadow-lg
                      p-4
                      hover:-translate-y-1
                      transition
                    "
                  >

                    <div className="flex justify-between items-center">

                      <div>

                        <p className="font-bold text-sky-800">
                          {upman.name}
                        </p>

                        <p className="text-sky-600 text-sm mt-1">
                          First discovered by
                        </p>

                        <p className="font-medium text-sky-900">
                          {upman.firstOwner}
                        </p>

                      </div>

                      <img
                        src={upman.image}
                        alt={upman.name}
                        className="w-16 h-16 object-contain"
                      />

                    </div>

                  </div>

                </Link>

              )
            )}

          </div>

        </section>

      </div>

    </main>
  );
}