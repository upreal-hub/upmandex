import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const updatedUpman =
      await req.json();

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

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}