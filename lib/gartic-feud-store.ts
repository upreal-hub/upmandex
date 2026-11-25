import "server-only";

import { prisma } from "@/lib/prisma";
import { move, newGame, upgradeDemo, type Game } from "./gartic-feud";

type Snapshot = { revision: number; state: Game };

export async function readGame(): Promise<Snapshot> {
  const [saved] = await prisma.$queryRaw<Snapshot[]>`
    SELECT "revision", "state" FROM "GarticFeud" WHERE "id" = 'anniversary'
  `;
  return saved ? { ...saved, state: upgradeDemo(saved.state) } : { revision: 0, state: newGame() };
}

export async function saveMove(revision: number, action: unknown): Promise<Snapshot | null> {
  const current = await readGame();
  if (current.revision !== revision) return null;
  const state = JSON.stringify(move(current.state, action));
  const [saved] = await prisma.$queryRaw<Snapshot[]>`
    INSERT INTO "GarticFeud" ("id", "revision", "state") VALUES ('anniversary', ${revision + 1}, ${state}::jsonb)
    ON CONFLICT ("id") DO UPDATE SET "revision" = EXCLUDED."revision", "state" = EXCLUDED."state"
    WHERE "GarticFeud"."revision" = ${revision}
    RETURNING "revision", "state"
  `;
  return saved ?? null;
}
