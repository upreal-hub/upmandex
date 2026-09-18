import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { createActivityLogData } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { validateUpmanPayload } from "@/lib/validation";

export async function GET() {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return authorization.response;
  }

  return NextResponse.json({
    route: "import-upman OK",
  });
}

export async function POST(req: Request) {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return authorization.response;
  }

  try {
    const validation = validateUpmanPayload(await req.json());
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const newUpman = validation.data;

    const existing =
      await prisma.upman.findUnique({
        where: {
          slug: newUpman.slug,
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Upman already exists",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const upman = await tx.upman.create({
        data: {
          slug: newUpman.slug,
          name: newUpman.name,
          rarity: newUpman.rarity,
          creator: newUpman.creator,
          image: newUpman.image,
          ownersCount: 0,
          firstOwner: null,
        },
        select: { id: true, slug: true, name: true },
      });

      await tx.activityLog.create({
        data: createActivityLogData({
          action: "UPMAN_CREATED",
          context: { origin: "IMPORT", actor: authorization.user },
          upman,
        }),
      });
    });

    return NextResponse.json({
      success: true,
    });

  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to import Upman",
      },
      { status: 500 }
    );
  }
}
