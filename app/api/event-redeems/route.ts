import { NextResponse } from "next/server";

import { getBearerToken, isStreamerBotAuthorized } from "@/lib/streamerbot-auth";
import { resolveEventRedeem } from "@/lib/upman-acquisitions";
import { validateEventRedeemPayload } from "@/lib/validation";

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
    const validation = validateEventRedeemPayload(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const result = await resolveEventRedeem({
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
      case "rule-not-found":
        return NextResponse.json(
          { success: false, error: "Event reward is not configured" },
          { status: 404 }
        );
      case "rule-unavailable":
        return NextResponse.json(
          { success: false, error: "Event reward is unavailable" },
          { status: 409 }
        );
      case "required-category-mismatch":
        return NextResponse.json(
          { success: false, error: "Event reward requirements are not met" },
          { status: 409 }
        );
      case "transaction-conflict":
        return NextResponse.json(
          {
            success: false,
            error: "Event redemption could not be completed. Retry with the same redemption ID.",
          },
          { status: 503 }
        );
      case "invalid-input":
        return NextResponse.json(
          { success: false, error: "Invalid event redemption" },
          { status: 400 }
        );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to resolve event redemption" },
      { status: 500 }
    );
  }
}
