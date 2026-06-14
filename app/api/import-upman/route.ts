import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json({
    route: "import-upman OK",
  });
}

export async function POST(req: Request) {
  try {
    const newUpman =
      await req.json();

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

    await prisma.upman.create({
      data: {
        slug: newUpman.slug,
        name: newUpman.name,
        rarity: newUpman.rarity,
        creator:
          newUpman.creator,
        image: newUpman.image,

        ownersCount: 0,
        firstOwner: null,
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