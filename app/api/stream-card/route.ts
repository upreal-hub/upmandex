import { NextResponse } from "next/server";

import { getBearerToken } from "@/lib/streamerbot-auth";
import { resolveStreamCard } from "@/lib/stream-card";
import { isStreamChatAuthorized } from "@/lib/stream-chat-auth";
import { validateStreamProfilePayload } from "@/lib/validation";

export const runtime = "nodejs";

/** Trusted, read-only public profile projection for Streamer.bot / OBS cards. */
export async function POST(request: Request) {
  const secret = getBearerToken(request) ?? "";
  if (!isStreamChatAuthorized(secret)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const validation = validateStreamProfilePayload(await request.json());
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const card = await resolveStreamCard(validation.data);
    return NextResponse.json({ success: true, card });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to resolve stream card" },
      { status: 500 }
    );
  }
}
