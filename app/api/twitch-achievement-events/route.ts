import { NextResponse } from "next/server";
import { TwitchAchievementEventKind } from "@/app/generated/prisma/client";
import { getBearerToken } from "@/lib/streamerbot-auth";
import { isStreamChatAuthorized } from "@/lib/stream-chat-auth";
import { recordTwitchAchievementEvent } from "@/lib/twitch-achievement-events";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isStreamChatAuthorized(getBearerToken(request) ?? "")) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !["CHECK_IN", "GARTIC_PARTICIPATION"].includes(String(body.kind))) return NextResponse.json({ success: false, error: "Invalid event" }, { status: 400 });
  const kind = body.kind as TwitchAchievementEventKind;
  const result = await recordTwitchAchievementEvent({ kind, redemptionId: String(body.redemptionId ?? ""), sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined, twitchUserId: String(body.twitchUserId ?? ""), twitchLogin: String(body.twitchLogin ?? ""), displayName: String(body.displayName ?? "") });
  const status = result.status === "invalid" ? 400 : result.status === "unlinked" ? 409 : result.status === "unavailable" ? 503 : 200;
  if (status === 200 && kind === "CHECK_IN") {
    if (result.status === "idempotent") return NextResponse.json({ success: true, result: "duplicate" });
    if (result.status === "recorded") return NextResponse.json({ success: true, result: "recorded", checkInCount: result.checkInCount, displayName: result.displayName });
  }
  return NextResponse.json({ success: status === 200, result: result.status }, { status });
}
