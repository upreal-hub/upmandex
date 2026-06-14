import { unlink } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { slug } = await req.json();

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing slug",
        },
        { status: 400 }
      );
    }

    const upman =
      await prisma.upman.findUnique({
        where: {
          slug,
        },
      });

    if (!upman) {
      return NextResponse.json(
        {
          success: false,
          error: "Upman not found",
        },
        { status: 404 }
      );
    }

    await prisma.inventory.deleteMany({
      where: {
        upmanId: upman.id,
      },
    });

    await prisma.upman.delete({
      where: {
        slug,
      },
    });

    const imagePath = path.join(
      process.cwd(),
      "public",
      "upmans",
      `${slug}.png`
    );

    try {
      await unlink(imagePath);
    } catch {
      console.log(
        "PNG already missing"
      );
    }

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