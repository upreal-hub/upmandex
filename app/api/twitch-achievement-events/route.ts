import { NextResponse } from "next/server";
import { TwitchAchievementEventKind } from "@/app/generated/prisma/client";
import { getBearerToken, isStreamerBotAuthorized } from "@/lib/streamerbot-auth";
import { recordTwitchAchievementEvent } from "@/lib/twitch-achievement-events";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isStreamerBotAuthorized(getBearerToken(request) ?? "")) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !["CHECK_IN", "GARTIC_PARTICIPATION"].includes(String(body.kind))) return NextResponse.json({ success: false, error: "Invalid event" }, { status: 400 });
  const result = await recordTwitchAchievementEvent({ kind: body.kind as TwitchAchievementEventKind, redemptionId: String(body.redemptionId ?? ""), sessionId: String(body.sessionId ?? ""), twitchUserId: String(body.twitchUserId ?? ""), twitchLogin: String(body.twitchLogin ?? ""), displayName: String(body.displayName ?? "") });
  const status = result.status === "invalid" ? 400 : result.status === "unlinked" ? 409 : result.status === "unavailable" ? 503 : 200;
  return NextResponse.json({ success: status === 200, result: result.status }, { status });
}
