import { Prisma } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/lib/authorization";
import { grantUpman, removeUpman } from "@/lib/inventory";
import { normalizeTwitchLogin, validateSlug } from "@/lib/validation";

import { NextResponse } from "next/server";

function isTransactionConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function getCollectionInput(request: Request) {
  try {
    const payload: unknown = await request.json();

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      Object.keys(payload).length !== 1 ||
      !("slug" in payload)
    ) {
      return null;
    }

    return validateSlug(payload.slug);
  } catch {
    return null;
  }
}

async function authorizeCollectionRequest(
  request: Request,
  params: Promise<{ viewer: string }>
) {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return { response: authorization.response };
  }

  const [{ viewer }, slug] = await Promise.all([params, getCollectionInput(request)]);
  const twitchLogin = normalizeTwitchLogin(viewer);

  if (!twitchLogin || !slug) {
    return {
      response: NextResponse.json(
        { success: false, error: "Invalid collection request" },
        { status: 400 }
      ),
    };
  }

  return { twitchLogin, slug };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ viewer: string }> }
) {
  const input = await authorizeCollectionRequest(request, params);
  if ("response" in input) {
    return input.response;
  }

  try {
    const result = await grantUpman({
      viewer: input.twitchLogin,
      displayName: input.twitchLogin,
      slug: input.slug,
      autoCreateUser: false,
    });

    switch (result.status) {
      case "granted":
        return NextResponse.json({ success: true, status: "granted" }, { status: 201 });
      case "already-owned":
        return NextResponse.json({ success: true, status: "already-owned" });
      case "viewer-not-found":
        return NextResponse.json({ success: false, error: "Viewer not found" }, { status: 404 });
      case "upman-not-found":
        return NextResponse.json({ success: false, error: "Upman not found" }, { status: 404 });
      case "invalid-input":
        return NextResponse.json({ success: false, error: "Invalid collection request" }, { status: 400 });
    }
  } catch (error) {
    if (isTransactionConflict(error)) {
      return NextResponse.json(
        { success: false, error: "Collection changed elsewhere. Refreshing..." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Could not update collection" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ viewer: string }> }
) {
  const input = await authorizeCollectionRequest(request, params);
  if ("response" in input) {
    return input.response;
  }

  try {
    const result = await removeUpman({
      viewer: input.twitchLogin,
      slug: input.slug,
    });

    switch (result.status) {
      case "removed":
        return NextResponse.json({ success: true, status: "removed" });
      case "not-owned":
        return NextResponse.json({ success: true, status: "not-owned" });
      case "viewer-not-found":
        return NextResponse.json({ success: false, error: "Viewer not found" }, { status: 404 });
      case "upman-not-found":
        return NextResponse.json({ success: false, error: "Upman not found" }, { status: 404 });
      case "invalid-input":
        return NextResponse.json({ success: false, error: "Invalid collection request" }, { status: 400 });
      case "owners-count-inconsistent":
        return NextResponse.json(
          { success: false, error: "Collection count needs administrator review" },
          { status: 409 }
        );
      case "transaction-conflict":
        return NextResponse.json(
          { success: false, error: "Collection changed elsewhere. Refreshing..." },
          { status: 409 }
        );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not update collection" },
      { status: 500 }
    );
  }
}
