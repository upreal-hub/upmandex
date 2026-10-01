import { NextResponse } from "next/server";

import { getBearerToken, isStreamerBotAuthorized } from "@/lib/streamerbot-auth";
import { updateStreamContext } from "@/lib/stream-context";
import { validateStreamContextPayload } from "@/lib/validation";

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
    const validation = validateStreamContextPayload(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const context = await updateStreamContext(validation.data);
    return NextResponse.json({
      success: true,
      isOnline: context.isOnline,
      twitchCategoryId: context.twitchCategoryId,
      twitchCategoryName: context.twitchCategoryName,
      updatedAt: context.updatedAt.toISOString(),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to update stream context" },
      { status: 500 }
    );
  }
}
