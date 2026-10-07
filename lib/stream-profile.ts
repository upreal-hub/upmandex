import "server-only";

import { Prisma } from "@/app/generated/prisma/client";
import { getAchievementCosmetic } from "@/lib/achievements";
import { prisma } from "@/lib/prisma";
import { publicUpmanWhere } from "@/lib/upman-visibility";
import { normalizeTwitchLogin } from "@/lib/validation";

const NORMAL_UPMAN_SLUG = "normalupman";
const DEFAULT_ACCENT = {
  label: "Anniversary Default",
  styleKey: "default",
} as const;

export type StreamProfileRequest = {
  twitchUserId: string | null;
  twitchLogin: string | null;
  displayName: string | null;
};

export type StreamProfile = {
  twitchUserId: string | null;
  login: string | null;
  displayName: string | null;
  accent: {
    label: string;
    styleKey: string;
  };
  representedUpman: {
    slug: string;
    name: string;
    image: string | null;
  };
};

async function findViewer(
  twitchUserId: string | null,
  twitchLogin: string | null
) {
  const select = {
    twitchUserId: true,
    twitchLogin: true,
    displayName: true,
    person: {
      select: {
        id: true,
        isPublic: true,
        equippedAccentAchievementKey: true,
        representedUpmans: {
          where: publicUpmanWhere,
          orderBy: [{ name: "asc" }, { slug: "asc" }],
          take: 1,
          select: { slug: true, name: true, image: true },
        },
      },
    },
  } satisfies Prisma.UserSelect;

  if (twitchUserId) {
    const user = await prisma.user.findUnique({
      where: { twitchUserId },
      select,
    });
    if (user) return user;
  }

  const normalizedLogin = normalizeTwitchLogin(twitchLogin);
  if (!normalizedLogin) return null;

  return prisma.user.findUnique({
    where: { twitchLogin: normalizedLogin },
    select,
  });
}

/**
 * Read-only projection for trusted stream integrations. It never creates or
 * updates Users, and only exposes public Person cosmetics and represented Upmans.
 */
export async function resolveStreamProfile(
  request: StreamProfileRequest
): Promise<StreamProfile> {
  const [normalUpman, viewer] = await Promise.all([
    prisma.upman.findUnique({
      where: { slug: NORMAL_UPMAN_SLUG },
      select: { slug: true, name: true, image: true },
    }),
    findViewer(request.twitchUserId, request.twitchLogin),
  ]);

  const fallbackUpman = {
    slug: NORMAL_UPMAN_SLUG,
    name: "NormalUpman",
    image: normalUpman?.image ?? null,
  };

  if (!viewer || !viewer.person?.isPublic) {
    return {
      twitchUserId: viewer?.twitchUserId ?? request.twitchUserId,
      login: viewer?.twitchLogin ?? normalizeTwitchLogin(request.twitchLogin),
      displayName: viewer?.displayName ?? request.displayName,
      accent: DEFAULT_ACCENT,
      representedUpman: fallbackUpman,
    };
  }

  const accentKey = viewer.person.equippedAccentAchievementKey;
  const unlockedAccent = accentKey
    ? await prisma.personAchievement.findUnique({
        where: {
          personId_achievementKey: {
            personId: viewer.person.id,
            achievementKey: accentKey,
          },
        },
        select: { achievementKey: true },
      })
    : null;
  const accent = unlockedAccent
    ? getAchievementCosmetic(unlockedAccent.achievementKey, "accent")
    : null;

  return {
    twitchUserId: viewer.twitchUserId ?? request.twitchUserId,
    login: viewer.twitchLogin,
    displayName: viewer.displayName,
    accent: accent ?? DEFAULT_ACCENT,
    representedUpman: viewer.person.representedUpmans[0] ?? fallbackUpman,
  };
}
