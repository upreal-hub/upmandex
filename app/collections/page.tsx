import { prisma } from "@/lib/prisma";
import CollectionsGrid from "@/components/CollectionsGrid";
import { publicInventoryWhere, publicUpmanWhere } from "@/lib/upman-visibility";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

export default async function CollectionsPage() {

  const users =
    await prisma.user.findMany({
      include: {
        inventory: { where: publicInventoryWhere },
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
    await prisma.upman.count({ where: publicUpmanWhere });

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
