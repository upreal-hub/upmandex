import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { changeCatalog, type CommandSnapshot } from "./twitch-command-catalog";

export async function readCommandCatalog(): Promise<CommandSnapshot> {
  const [row] = await prisma.$queryRaw<CommandSnapshot[]>`
    SELECT "revision", "catalog" FROM "TwitchCommandCatalog" WHERE "id" = 'official'
  `;
  if (!row) throw new Error("Twitch command catalog has not been initialized.");
  return row;
}

export async function saveCommandCatalog(revision: number, input: unknown): Promise<CommandSnapshot | null> {
  const current = await readCommandCatalog();
  if (current.revision !== revision) return null;
  const catalog = JSON.stringify(changeCatalog(current.catalog, input, randomUUID));
  const [row] = await prisma.$queryRaw<CommandSnapshot[]>`
    UPDATE "TwitchCommandCatalog" SET "revision" = "revision" + 1, "catalog" = ${catalog}::jsonb
    WHERE "id" = 'official' AND "revision" = ${revision}
    RETURNING "revision", "catalog"
  `;
  return row ?? null;
}
