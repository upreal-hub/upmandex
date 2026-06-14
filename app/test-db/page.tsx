import { prisma } from "@/lib/prisma";

export default async function TestDb() {
  const upmans =
    await prisma.upman.findMany();

  return (
    <main className="p-10">
      <h1>
        {upmans.length} Upmans
      </h1>
    </main>
  );
}
