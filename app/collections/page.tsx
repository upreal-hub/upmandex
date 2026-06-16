import { prisma } from "@/lib/prisma";
import CollectionsGrid from "@/components/CollectionsGrid";

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

      <CollectionsGrid
  users={users}
  totalUpmans={totalUpmans}
/>

    </main>
  );
}