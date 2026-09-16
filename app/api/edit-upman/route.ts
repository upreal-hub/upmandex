import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { validateUpmanUpdatePayload } from "@/lib/validation";

export async function POST(req: Request) {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return authorization.response;
  }

  try {
    const validation = validateUpmanUpdatePayload(await req.json());
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const updatedUpman = validation.data;

    const existingUpman =
      await prisma.upman.findUnique({
        where: {
          slug: updatedUpman.slug,
        },
      });

    if (!existingUpman) {
      return NextResponse.json(
        {
          success: false,
          error: "Upman not found",
        },
        { status: 404 }
      );
    }

    await prisma.upman.update({
      where: {
        slug: updatedUpman.slug,
      },

      data: {
        name: updatedUpman.name,
        creator: updatedUpman.creator,
        rarity: updatedUpman.rarity,
      },
    });

    return NextResponse.json({
      success: true,
    });

  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to update Upman",
      },
      { status: 500 }
    );
  }
}
