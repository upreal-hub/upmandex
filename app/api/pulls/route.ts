import { NextResponse } from "next/server";

import { resolvePull } from "@/lib/pulls";
import { getBearerToken, isStreamerBotAuthorized } from "@/lib/streamerbot-auth";
import { validatePullPayload } from "@/lib/validation";

export async function POST(request: Request) {
  const secret = getBearerToken(request) ?? "";
  if (!isStreamerBotAuthorized(secret)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const validation = validatePullPayload(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const result = await resolvePull(validation.data);

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
      case "no-pullable-upman":
        return NextResponse.json(
          { success: false, error: "No pullable Upman is available" },
          { status: 422 }
        );
      case "transaction-conflict":
        return NextResponse.json(
          { success: false, error: "Pull could not be completed. Retry with the same request ID." },
          { status: 503 }
        );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to resolve pull" },
      { status: 500 }
    );
  }
}
