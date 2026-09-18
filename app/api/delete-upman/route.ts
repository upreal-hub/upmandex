import { unlink } from "fs/promises";
import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import path from "path";

import { requireAdmin } from "@/lib/authorization";
import { isManagedUpmanBlobUrl } from "@/lib/blob";
import { prisma } from "@/lib/prisma";
import { validateSlug } from "@/lib/validation";

export async function POST(req: Request) {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return authorization.response;
  }

  try {
    const payload = await req.json();
    const slug = validateSlug(payload?.slug);

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

    if (isManagedUpmanBlobUrl(upman.image)) {
      try {
        await del(upman.image);
      } catch {
        console.error("Unable to delete the Upman image from Blob storage.");

        return NextResponse.json({
          success: true,
          warning: "Upman deleted, but image cleanup could not be completed.",
        });
      }
    } else {
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
    }

    return NextResponse.json({
      success: true,
    });

  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to delete Upman",
      },
      { status: 500 }
    );
  }
}
