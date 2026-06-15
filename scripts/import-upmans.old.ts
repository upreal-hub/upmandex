import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { readFile } from "fs/promises";
import path from "path";
console.log(process.env.DATABASE_URL);
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const filePath = path.join(
    process.cwd(),
    "data",
    "upmans.json"
  );

  const content = await readFile(
    filePath,
    "utf8"
  );

  const upmans = JSON.parse(content);

  for (const upman of upmans) {
    await prisma.upman.upsert({
      where: {
        slug: upman.slug,
      },

      update: {
        name: upman.name,
        image: upman.image,
        rarity: upman.rarity,
        creator: upman.creator,
        creatorTwitch:
          upman.creatorTwitch ?? null,
        ownersCount:
          upman.owners ?? 0,
        firstOwner:
          upman.firstOwner ?? null,
      },

      create: {
        slug: upman.slug,
        name: upman.name,
        image: upman.image,
        rarity: upman.rarity,
        creator: upman.creator,
        creatorTwitch:
          upman.creatorTwitch ?? null,
        ownersCount:
          upman.owners ?? 0,
        firstOwner:
          upman.firstOwner ?? null,
      },
    });
  }

  console.log(
    `✅ Imported ${upmans.length} Upmans`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });