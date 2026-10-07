import { NextResponse } from "next/server";

import { getBearerToken, isStreamerBotAuthorized } from "@/lib/streamerbot-auth";
import { resolveStreamProfile } from "@/lib/stream-profile";
import { validateStreamProfilePayload } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = getBearerToken(request) ?? "";
  if (!isStreamerBotAuthorized(secret)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const validation = validateStreamProfilePayload(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const profile = await resolveStreamProfile(validation.data);
    return NextResponse.json({ success: true, profile });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to resolve stream profile" },
      { status: 500 }
    );
  }
}
