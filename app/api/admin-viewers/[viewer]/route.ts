import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin, RARITIES } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ viewer: string }> }
) {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return authorization.response;
  }

  const { viewer } = await params;
  const twitchLogin = normalizeTwitchLogin(viewer);

  if (!twitchLogin) {
    return NextResponse.json(
      { success: false, error: "Invalid viewer" },
      { status: 400 }
    );
  }

  const [user, totalUpmans] = await Promise.all([
    prisma.user.findUnique({
      where: { twitchLogin },
      select: {
        twitchLogin: true,
        displayName: true,
        avatar: true,
        role: true,
        createdAt: true,
        inventory: {
          orderBy: { obtainedAt: "desc" },
          select: {
            obtainedAt: true,
            upman: {
              select: {
                slug: true,
                name: true,
                image: true,
                rarity: true,
              },
            },
          },
        },
      },
    }),
    prisma.upman.count(),
  ]);

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Viewer not found" },
      { status: 404 }
    );
  }

  const rarityBreakdown = Object.fromEntries(
    RARITIES.map((rarity) => [rarity, 0])
  ) as Record<(typeof RARITIES)[number], number>;

  for (const entry of user.inventory) {
    if (entry.upman.rarity in rarityBreakdown) {
      rarityBreakdown[entry.upman.rarity as keyof typeof rarityBreakdown] += 1;
    }
  }

  const recentDiscoveries = user.inventory.slice(0, 5);

  return NextResponse.json({
    twitchLogin: user.twitchLogin,
    displayName: user.displayName,
    avatar: user.avatar,
    role: user.role,
    createdAt: user.createdAt,
    ownedCount: user.inventory.length,
    completion:
      totalUpmans > 0 ? (user.inventory.length / totalUpmans) * 100 : 0,
    latestDiscovery: recentDiscoveries[0] ?? null,
    rarityBreakdown,
    recentDiscoveries,
  });
}
