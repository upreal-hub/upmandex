import { NextResponse } from "next/server";

import { getBearerToken, isStreamerBotAuthorized } from "@/lib/streamerbot-auth";
import { resolveStreamCommand } from "@/lib/upman-acquisitions";
import { validateStreamCommandPayload } from "@/lib/validation";

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
    const validation = validateStreamCommandPayload(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const result = await resolveStreamCommand({
      ...validation.data,
      context: { origin: "STREAMERBOT" },
    });

    switch (result.status) {
      case "resolved":
        return NextResponse.json({
          success: true,
          idempotent: result.idempotent,
          result: result.result,
          viewer: result.viewer,
          upman: result.upman,
        });
      case "identity-conflict":
        return NextResponse.json(
          { success: false, error: "Viewer identity conflict" },
          { status: 409 }
        );
      case "transaction-conflict":
        return NextResponse.json(
          {
            success: false,
            error: "Stream command could not be completed. Retry with the same message ID.",
          },
          { status: 503 }
        );
      case "invalid-input":
        return NextResponse.json(
          { success: false, error: "Invalid stream command" },
          { status: 400 }
        );
      case "rule-not-found":
      case "rule-unavailable":
      case "required-category-mismatch":
        return NextResponse.json(
          { success: false, error: "Command unavailable" },
          { status: 404 }
        );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to resolve stream command" },
      { status: 500 }
    );
  }
}
