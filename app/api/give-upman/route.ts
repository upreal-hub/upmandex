import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authorization";
import { grantUpman } from "@/lib/inventory";
import { validateInventoryPayload } from "@/lib/validation";

export async function GET() {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return authorization.response;
  }

  return NextResponse.json({
    route: "give-upman OK",
  });
}

export async function POST(req: Request) {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return authorization.response;
  }

  try {
    const validation = validateInventoryPayload(await req.json());
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const result = await grantUpman({
      viewer: validation.data.viewer,
      displayName: validation.data.viewer,
      slug: validation.data.slug,
      autoCreateUser: false,
    });

    if (result.status === "viewer-not-found") {
      return NextResponse.json(
        { success: false, error: "Viewer not found" },
        { status: 404 }
      );
    }

    if (result.status === "upman-not-found") {
      return NextResponse.json(
        { success: false, error: "Upman not found" },
        { status: 404 }
      );
    }

    if (result.status === "already-owned") {
      return NextResponse.json(
        { success: false, error: "Upman already owned" },
        { status: 400 }
      );
    }

    if (result.status === "invalid-input") {
      return NextResponse.json(
        { success: false, error: "Missing viewer or slug" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to give Upman" },
      { status: 500 }
    );
  }
}
