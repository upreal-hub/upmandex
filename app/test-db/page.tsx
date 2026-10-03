import { prisma } from "@/lib/prisma";
import { publicUpmanWhere } from "@/lib/upman-visibility";

export default async function TestDb() {
  const upmans =
    await prisma.upman.findMany({ where: publicUpmanWhere });

  return (
    <main className="p-10">
      <h1>
        {upmans.length} Upmans
      </h1>
    </main>
  );
}
