import "server-only";

import { ProfileCosmeticAssetType, Prisma } from "@/app/generated/prisma/client";
import { getAchievementCosmetic } from "@/lib/achievements";
import { classicCollectionUpmanWhere } from "@/lib/classic-collection";
import { prisma } from "@/lib/prisma";
import {
  resolveStreamProfile,
  type StreamProfileRequest,
} from "@/lib/stream-profile";
import { normalizeTwitchLogin } from "@/lib/validation";

type StreamCardFallback = {
  kind: "twitch";
  displayName: string;
  login: string | null;
  avatar: string | null;
  message: string;
};

type StreamCardPublicProfile = {
  kind: "upmandex";
  displayName: string;
  login: string | null;
  avatar: string | null;
  personId: string;
  profilePath: string;
  title: string | null;
  accent: { label: string; styleKey: string };
  background: Awaited<ReturnType<typeof resolveStreamProfile>>["background"];
  banner:
    | { kind: "custom"; image: string }
    | { kind: "achievement"; label: string; styleKey: string }
    | { kind: "default" };
  representedUpman: Awaited<ReturnType<typeof resolveStreamProfile>>["representedUpman"];
  collection: { owned: number; total: number; percent: number };
};

export type StreamCard = StreamCardFallback | StreamCardPublicProfile;

const viewerSelect = {
  twitchUserId: true,
  twitchLogin: true,
  displayName: true,
  avatar: true,
  person: {
    select: {
      id: true,
      isPublic: true,
      userId: true,
      equippedTitleAchievementKey: true,
      equippedBannerAchievementKey: true,
      equippedCustomBanner: { select: { type: true, image: true } },
    },
  },
} satisfies Prisma.UserSelect;

async function findViewer(twitchUserId: string | null, twitchLogin: string | null) {
  if (twitchUserId) {
    const user = await prisma.user.findUnique({ where: { twitchUserId }, select: viewerSelect });
    if (user) return user;
  }

  const login = normalizeTwitchLogin(twitchLogin);
  return login
    ? prisma.user.findUnique({ where: { twitchLogin: login }, select: viewerSelect })
    : null;
}

/**
 * Public card projection for trusted stream integrations. The represented
 * Upman, accent, and background deliberately come from resolveStreamProfile,
 * keeping this projection aligned with the established TTS behavior.
 */
export async function resolveStreamCard(request: StreamProfileRequest): Promise<StreamCard> {
  const [streamProfile, viewer] = await Promise.all([
    resolveStreamProfile(request),
    findViewer(request.twitchUserId, request.twitchLogin),
  ]);

  const fallback: StreamCardFallback = {
    kind: "twitch",
    displayName: viewer?.displayName ?? request.displayName ?? viewer?.twitchLogin ?? request.twitchLogin ?? "Twitch viewer",
    login: viewer?.twitchLogin ?? normalizeTwitchLogin(request.twitchLogin),
    avatar: viewer?.avatar ?? null,
    message: "Join UPMANDEX to share your Cloud World card!",
  };

  const person = viewer?.person;
  const userId = person?.userId;
  if (!viewer || !person?.isPublic || !userId) return fallback;
  const equippedKeys = [person.equippedTitleAchievementKey, person.equippedBannerAchievementKey]
    .filter((key): key is string => Boolean(key));
  const [unlocks, total, owned] = await Promise.all([
    equippedKeys.length
      ? prisma.personAchievement.findMany({
          where: { personId: person.id, achievementKey: { in: equippedKeys } },
          select: { achievementKey: true },
        })
      : [],
    prisma.upman.count({ where: classicCollectionUpmanWhere }),
    prisma.inventory.count({
      where: { userId, upman: classicCollectionUpmanWhere },
    }),
  ]);
  const unlocked = new Set(unlocks.map((item) => item.achievementKey));
  const title = person.equippedTitleAchievementKey && unlocked.has(person.equippedTitleAchievementKey)
    ? getAchievementCosmetic(person.equippedTitleAchievementKey, "title")
    : null;
  const achievementBanner = person.equippedBannerAchievementKey && unlocked.has(person.equippedBannerAchievementKey)
    ? getAchievementCosmetic(person.equippedBannerAchievementKey, "banner")
    : null;
  const banner = person.equippedCustomBanner?.type === ProfileCosmeticAssetType.BANNER && person.equippedCustomBanner.image
    ? { kind: "custom" as const, image: person.equippedCustomBanner.image }
    : achievementBanner
      ? { kind: "achievement" as const, label: achievementBanner.label, styleKey: achievementBanner.styleKey }
      : { kind: "default" as const };

  return {
    kind: "upmandex",
    displayName: viewer.displayName,
    login: viewer.twitchLogin,
    avatar: viewer.avatar,
    personId: person.id,
    profilePath: `/people/${encodeURIComponent(person.id)}`,
    title: title?.label ?? null,
    accent: streamProfile.accent,
    background: streamProfile.background,
    banner,
    representedUpman: streamProfile.representedUpman,
    collection: {
      owned,
      total,
      percent: total ? Math.round((owned / total) * 100) : 0,
    },
  };
}
