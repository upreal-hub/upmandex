import "server-only";

import { Prisma, TwitchAchievementEventKind } from "@/app/generated/prisma/client";
import { safelySyncPersonAchievements } from "@/lib/achievements";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";

export type TwitchAchievementEventInput = { kind: TwitchAchievementEventKind; redemptionId: string; sessionId: string; twitchUserId: string; twitchLogin: string; displayName: string };
const TWITCH_ID = /^[1-9][0-9]{0,29}$/; const ID = /^[a-zA-Z0-9:_-]{1,180}$/;

export async function recordTwitchAchievementEvent(input: TwitchAchievementEventInput) {
  const twitchLogin = normalizeTwitchLogin(input.twitchLogin);
  if (!twitchLogin || !TWITCH_ID.test(input.twitchUserId) || !ID.test(input.redemptionId) || !ID.test(input.sessionId) || !input.displayName.trim()) return { status: "invalid" as const };
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({ where: { OR: [{ twitchUserId: input.twitchUserId }, { twitchLogin }] }, select: { id: true, twitchUserId: true, twitchLogin: true, person: { select: { id: true } } } });
      if (!user || user.twitchUserId !== input.twitchUserId || !user.person) return { status: "unlinked" as const };
      const existing = await tx.twitchAchievementEvent.findUnique({ where: { redemptionId: input.redemptionId }, select: { id: true } });
      if (existing) return { status: "idempotent" as const, personId: user.person.id };
      try {
        await tx.twitchAchievementEvent.create({ data: { kind: input.kind, redemptionId: input.redemptionId, sessionId: input.sessionId, userId: user.id, twitchUserId: input.twitchUserId, twitchLogin: user.twitchLogin, displayName: input.displayName.trim() } });
        return { status: "recorded" as const, personId: user.person.id };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { status: "session-duplicate" as const, personId: user.person.id };
        throw error;
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if ("personId" in result && typeof result.personId === "string") await safelySyncPersonAchievements(result.personId);
    return result;
  } catch { return { status: "unavailable" as const }; }
}
