import { NextResponse } from "next/server";

import {
  ActiveEventUpmanConfigError,
  saveActiveEventUpmanConfig,
} from "@/lib/active-event-upman";
import { requireAdmin } from "@/lib/authorization";
import { validateActiveEventUpmanPayload } from "@/lib/validation";

export async function PATCH(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return authorization.response;
  }

  const validation = validateActiveEventUpmanPayload(
    await request.json().catch(() => null)
  );
  if (!validation.success) {
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  }

  try {
    const config = await saveActiveEventUpmanConfig(validation.data);
    return NextResponse.json({ success: true, config });
  } catch (error) {
    if (error instanceof ActiveEventUpmanConfigError) {
      const responses = {
        "event-not-found": ["Anniversary event configuration is unavailable", 404],
        "invalid-upman": ["Select an Event rarity Upman", 400],
        "reward-id-in-use": ["This Twitch Reward ID is already configured for another event", 409],
        "transaction-conflict": ["Event configuration changed. Please retry.", 409],
      } as const;
      const [message, status] = responses[error.code];
      return NextResponse.json({ success: false, error: message }, { status });
    }

    return NextResponse.json(
      { success: false, error: "Unable to save Event Upman configuration" },
      { status: 500 }
    );
  }
}
