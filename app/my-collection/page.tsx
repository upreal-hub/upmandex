import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import UpmanCard from "@/components/UpmanCard";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.name) {
    redirect("/");
  }

  const user =
    await prisma.user.findUnique({
      where: {
        twitchLogin:
          session.user.name,
      },

      include: {
        inventory: {
          include: {
            upman: true,
          },
        },
      },
    });

  if (!user) {
    redirect("/");
  }

  const ownedUpmans =
    user.inventory.map(
      (item) => item.upman
    );

  const totalUpmans =
    await prisma.upman.count();

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

  const mythicCount =
    ownedUpmans.filter(
      (u) =>
        u.rarity ===
        "Mythic"
    ).length;

  const legendaryCount =
    ownedUpmans.filter(
      (u) =>
        u.rarity ===
        "Legendary"
    ).length;

  const latestDiscovery =
    ownedUpmans[
      ownedUpmans.length - 1
    ];

  return (
    <main>
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

            {user.avatar ? (
              <img
                src={user.avatar}
                alt={
                  user.displayName
                }
                className="
                  w-28
                  h-28
                  rounded-full
                  border-4
                  border-sky-300
                "
              />
            ) : (
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
            )}

            <div>

              <p className="uppercase tracking-[0.3em] text-sky-500 text-sm">
                ☁️ Explorer Profile
              </p>

              <h1 className="text-5xl font-black text-sky-800 mt-2">
                {user.displayName}
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

      <div className="grid md:grid-cols-3 gap-6 mb-12">

        <div className="bg-white/80 rounded-3xl shadow-xl p-6">

          <p className="text-sky-500">
            📦 Collection
          </p>

          <p className="font-black text-sky-800 text-3xl mt-2">
            {ownedCount}
          </p>

        </div>

        <div className="bg-white/80 rounded-3xl shadow-xl p-6">

          <p className="text-sky-500">
            🔥 Mythics
          </p>

          <p className="font-black text-sky-800 text-3xl mt-2">
            {mythicCount}
          </p>

        </div>

        <div className="bg-white/80 rounded-3xl shadow-xl p-6">

          <p className="text-sky-500">
            👑 Legendaries
          </p>

          <p className="font-black text-sky-800 text-3xl mt-2">
            {legendaryCount}
          </p>

        </div>

      </div>

      {latestDiscovery && (

        <div className="bg-white/80 rounded-3xl shadow-xl p-6 mb-12">

          <p className="text-sky-500">
            ✨ Latest Discovery
          </p>

          <p className="font-black text-sky-800 text-2xl mt-2">
            {latestDiscovery.name}
          </p>

        </div>

      )}

      <h2 className="text-4xl font-black text-sky-800 mb-8">
        🎒 My Collection
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
          (upman) => (
            <UpmanCard
              key={upman.slug}
              slug={upman.slug}
              name={upman.name}
              image={upman.image}
              rarity={
                upman.rarity as
                  | "Common"
                  | "Rare"
                  | "Epic"
                  | "Mythic"
                  | "Legendary"
              }
            />
          )
        )}

      </div>

    </main>
  );
}