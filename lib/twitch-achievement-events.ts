import "server-only";

import { Prisma, TwitchAchievementEventKind } from "@/app/generated/prisma/client";
import { safelySyncPersonAchievements } from "@/lib/achievements";
import { prisma } from "@/lib/prisma";
import { getActiveTwitchStream } from "@/lib/twitch-live-stream";
import { normalizeTwitchLogin } from "@/lib/validation";

export type TwitchAchievementEventInput = { kind: TwitchAchievementEventKind; redemptionId: string; sessionId?: string | null; twitchUserId: string; twitchLogin: string; displayName: string };
const TWITCH_ID = /^[1-9][0-9]{0,29}$/; const ID = /^[a-zA-Z0-9:_-]{1,180}$/;

export async function recordTwitchAchievementEvent(input: TwitchAchievementEventInput) {
  const twitchLogin = normalizeTwitchLogin(input.twitchLogin);
  const sessionId = input.sessionId?.trim() ?? "";
  const requiresSession = input.kind === "GARTIC_PARTICIPATION";
  if (!twitchLogin || !TWITCH_ID.test(input.twitchUserId) || !ID.test(input.redemptionId) || (requiresSession && !ID.test(sessionId)) || !input.displayName.trim()) return { status: "invalid" as const };

  const previousRedemption = await prisma.twitchAchievementEvent.findUnique({ where: { redemptionId: input.redemptionId }, select: { id: true } }).catch(() => null);
  if (previousRedemption) return { status: "idempotent" as const };

  let resolvedSessionId: string | null = requiresSession ? sessionId : null;
  if (input.kind === "FIRST") {
    const stream = await getActiveTwitchStream();
    if (stream.status !== "active") return { status: stream.status };
    resolvedSessionId = stream.streamId;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({ where: { OR: [{ twitchUserId: input.twitchUserId }, { twitchLogin }] }, select: { id: true, twitchUserId: true, twitchLogin: true, displayName: true, person: { select: { id: true } } } });
      if (!user || user.twitchUserId !== input.twitchUserId || !user.person) return { status: "unlinked" as const };
      const existing = await tx.twitchAchievementEvent.findUnique({ where: { redemptionId: input.redemptionId }, select: { id: true } });
      if (existing) return { status: "idempotent" as const, personId: user.person.id };
      await tx.twitchAchievementEvent.create({ data: { kind: input.kind, redemptionId: input.redemptionId, sessionId: resolvedSessionId, userId: user.id, twitchUserId: input.twitchUserId, twitchLogin: user.twitchLogin, displayName: input.displayName.trim() } });
      const checkInCount = input.kind === "CHECK_IN"
        ? await tx.twitchAchievementEvent.count({ where: { userId: user.id, kind: "CHECK_IN" } })
        : undefined;
      const firstCount = input.kind === "FIRST"
        ? await tx.twitchAchievementEvent.count({ where: { userId: user.id, kind: "FIRST" } })
        : undefined;
      return { status: "recorded" as const, personId: user.person.id, checkInCount, firstCount, displayName: user.displayName };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if ("personId" in result && typeof result.personId === "string") await safelySyncPersonAchievements(result.personId);
    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.twitchAchievementEvent.findUnique({ where: { redemptionId: input.redemptionId }, select: { id: true } }).catch(() => null);
      if (existing) return { status: "idempotent" as const };
      if (input.kind === "FIRST") return { status: "first-already-claimed" as const };
      return { status: input.kind === "CHECK_IN" ? "idempotent" as const : "session-duplicate" as const };
    }
    return { status: "unavailable" as const };
  }
}
