import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { grantUpman } from "@/lib/inventory";
import { validateInventoryPayload } from "@/lib/validation";

function isAuthorized(providedSecret: string): boolean {
  const expectedSecret = process.env.STREAMERBOT_SECRET;

  if (!providedSecret || !expectedSecret) {
    return false;
  }

  const provided = Buffer.from(providedSecret);
  const expected = Buffer.from(expectedSecret);

  return (
    provided.length === expected.length &&
    timingSafeEqual(provided, expected)
  );
}

function bearerToken(req: Request): string | null {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

async function rewardUpman(input: {
  secret: string;
  viewer: unknown;
  slug: unknown;
}) {
  if (!isAuthorized(input.secret)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const validation = validateInventoryPayload({
    viewer: input.viewer,
    slug: input.slug,
  });

  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 400 }
    );
  }

  const result = await grantUpman({
    viewer: validation.data.viewer,
    displayName:
      typeof input.viewer === "string"
        ? input.viewer.trim()
        : validation.data.viewer,
    slug: validation.data.slug,
    autoCreateUser: true,
  });

  if (result.status === "upman-not-found") {
    return NextResponse.json(
      { success: false, error: "Upman not found" },
      { status: 404 }
    );
  }

  if (result.status === "already-owned") {
    return NextResponse.json({ success: true, alreadyOwned: true });
  }

  if (result.status === "invalid-input") {
    return NextResponse.json(
      { success: false, error: "Missing viewer or slug" },
      { status: 400 }
    );
  }

  if (result.status === "viewer-not-found") {
    return NextResponse.json(
      { success: false, error: "Viewer not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    upman: result.upmanName,
    viewer: result.viewer,
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    return rewardUpman({
      secret: bearerToken(req) ?? searchParams.get("secret") ?? "",
      viewer: searchParams.get("viewer") ?? "",
      slug: searchParams.get("slug") ?? "",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to reward Upman" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const payload = body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};

    return rewardUpman({
      secret:
        bearerToken(req) ??
        (typeof payload.secret === "string" ? payload.secret : ""),
      viewer: payload.viewer,
      slug: payload.slug,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to reward Upman" },
      { status: 500 }
    );
  }
}
