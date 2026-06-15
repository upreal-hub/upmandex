import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

export default async function CollectionsPage() {

  const users =
    await prisma.user.findMany({
      include: {
        inventory: true,
      },
      orderBy: {
        displayName: "asc",
      },
    });

  console.log(
    "COLLECTION USERS =",
    users.map(
      (u) => u.displayName
    )
  );

  const totalUpmans =
    await prisma.upman.count();

  return (
    <main>

      <h1 className="text-6xl font-bold mb-4">
        🎒 Collections
      </h1>

      <p className="opacity-70 mb-10">
        Browse collector profiles
      </p>

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-2
          xl:grid-cols-3
          gap-6
        "
      >

        {users.map((user) => {

          const ownedCount =
            user.inventory.length;

          const completion =
            totalUpmans > 0
              ? (
                  (ownedCount /
                    totalUpmans) *
                  100
                ).toFixed(1)
              : "0";

          return (
            <Link
              key={user.id}
              href={`/collection/${user.twitchLogin}`}
            >

              <div
                className="
                  border
                  border-slate-700
                  rounded-xl
                  p-6
                  hover:border-blue-500
                  transition
                  cursor-pointer
                "
              >

                <h2 className="text-2xl font-bold mb-4">
                  👤 {user.displayName}
                </h2>

                <p>
                  📦 {ownedCount} / {totalUpmans}
                </p>

                <p className="mt-2 opacity-70">
                  🎯 {completion}% Complete
                </p>

              </div>

            </Link>
          );
        })}

      </div>

    </main>
  );
}