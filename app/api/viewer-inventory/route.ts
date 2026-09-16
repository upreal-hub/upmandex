import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const viewer = searchParams.get("viewer");

    if (!viewer) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing viewer",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        twitchLogin: viewer.trim().toLowerCase(),
      },
      select: {
        inventory: {
          orderBy: { obtainedAt: "asc" },
          select: {
            upman: {
              select: { slug: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      inventory: {
        upmans: user?.inventory.map((entry) => entry.upman.slug) ?? [],
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to load inventory",
      },
      { status: 500 }
    );
  }
}
