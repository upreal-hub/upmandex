import "server-only";

import { Prisma, ProfileCosmeticAssetType } from "@/app/generated/prisma/client";
import { getAchievementCosmetic } from "@/lib/achievements";
import { prisma } from "@/lib/prisma";
import {
  getStreamAchievementBackgroundAppearance,
  type StreamBackgroundAppearance,
} from "@/lib/stream-profile-backgrounds";
import { publicUpmanWhere } from "@/lib/upman-visibility";
import { normalizeTwitchLogin } from "@/lib/validation";

const NORMAL_UPMAN_SLUG = "normalupman";
const DEFAULT_ACCENT = {
  label: "Anniversary Default",
  styleKey: "default",
} as const;
const DEFAULT_BACKGROUND = { kind: "default" } as const;

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
  background:
    | {
        kind: "achievement";
        styleKey: string;
        appearance: StreamBackgroundAppearance;
      }
    | {
        kind: "custom";
        image: string;
      }
    | typeof DEFAULT_BACKGROUND;
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
        equippedBackgroundAchievementKey: true,
        equippedCustomBackground: {
          select: { type: true, image: true },
        },
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
      background: DEFAULT_BACKGROUND,
      representedUpman: fallbackUpman,
    };
  }

  const accentKey = viewer.person.equippedAccentAchievementKey;
  const backgroundKey = viewer.person.equippedBackgroundAchievementKey;
  const equippedKeys = [...new Set([accentKey, backgroundKey].filter((key): key is string => Boolean(key)))];
  const unlockedAchievements = equippedKeys.length
    ? await prisma.personAchievement.findMany({
        where: {
          personId: viewer.person.id,
          achievementKey: { in: equippedKeys },
        },
        select: { achievementKey: true },
      })
    : [];
  const unlockedKeys = new Set(unlockedAchievements.map((achievement) => achievement.achievementKey));
  const accent = accentKey && unlockedKeys.has(accentKey)
    ? getAchievementCosmetic(accentKey, "accent")
    : null;
  const customBackground = viewer.person.equippedCustomBackground;
  const achievementBackground = backgroundKey && unlockedKeys.has(backgroundKey)
    ? getAchievementCosmetic(backgroundKey, "background")
    : null;
  const background = customBackground?.type === ProfileCosmeticAssetType.BACKGROUND && customBackground.image
    ? { kind: "custom" as const, image: customBackground.image }
    : achievementBackground
      ? (() => {
          const appearance = getStreamAchievementBackgroundAppearance(achievementBackground.styleKey);
          return appearance
            ? { kind: "achievement" as const, styleKey: achievementBackground.styleKey, appearance }
            : DEFAULT_BACKGROUND;
        })()
      : DEFAULT_BACKGROUND;

  return {
    twitchUserId: viewer.twitchUserId ?? request.twitchUserId,
    login: viewer.twitchLogin,
    displayName: viewer.displayName,
    accent: accent ?? DEFAULT_ACCENT,
    background,
    representedUpman: viewer.person.representedUpmans[0] ?? fallbackUpman,
  };
}
