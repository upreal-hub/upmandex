import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import { publicInventoryWhere } from "@/lib/upman-visibility";
import { isPrivateSiteMember } from "@/lib/private-site-access";
import { isSitePrivate } from "@/lib/site-publication";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(req: Request) {
  const privateAccess = await isSitePrivate();
  const headers = privateAccess ? privateHeaders : undefined;
  if (privateAccess) {
    const id = (await auth())?.user?.twitchUserId;
    if (!isPrivateSiteMember(id)) {
      return NextResponse.json({ error: "Private access required" }, { status: id ? 403 : 401, headers });
    }
  }
  try {
    const { searchParams } = new URL(req.url);
    const viewer = searchParams.get("viewer");

    if (!viewer) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing viewer",
        },
        { status: 400, headers }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        twitchLogin: viewer.trim().toLowerCase(),
      },
      select: {
        inventory: {
          where: publicInventoryWhere,
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
    }, { headers });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to load inventory",
      },
      { status: 500, headers }
    );
  }
}
