import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";

export type TwitchIdentityInput = {
  twitchUserId: string;
  twitchLogin: string;
  displayName: string;
  avatar?: string | null;
};

export type TwitchIdentityResolution =
  | {
      status: "resolved";
      user: { id: string; twitchLogin: string; twitchUserId: string | null };
    }
  | { status: "identity-conflict" };

export async function resolveTwitchIdentity(
  tx: Prisma.TransactionClient,
  identity: TwitchIdentityInput,
  diagnostic?: (stage: "owner-admin-not-found" | "owner-admin-not-linked" | "owner-account-not-admin" | "owner-admin-verified") => void
): Promise<TwitchIdentityResolution> {
  const [userByTwitchId, userByLogin] = await Promise.all([
    tx.user.findUnique({
      where: { twitchUserId: identity.twitchUserId },
      select: { id: true, twitchUserId: true, twitchLogin: true, role: true },
    }),
    tx.user.findUnique({
      where: { twitchLogin: identity.twitchLogin },
      select: { id: true, twitchUserId: true, twitchLogin: true, role: true },
    }),
  ]);

  // Observation only: all binding, conflict and role rules below are unchanged.
  if (userByTwitchId?.role === "ADMIN") diagnostic?.("owner-admin-verified");
  else if (userByLogin?.role === "ADMIN" && !userByTwitchId) diagnostic?.("owner-admin-not-linked");
  else if (!userByTwitchId && !userByLogin) diagnostic?.("owner-admin-not-found");
  else diagnostic?.("owner-account-not-admin");

  if (userByTwitchId && userByLogin && userByTwitchId.id !== userByLogin.id) {
    return { status: "identity-conflict" };
  }

  const existingUser = userByTwitchId ?? userByLogin;

  if (!existingUser) {
    const user = await tx.user.create({
      data: {
        twitchUserId: identity.twitchUserId,
        twitchLogin: identity.twitchLogin,
        displayName: identity.displayName,
        avatar: identity.avatar ?? null,
      },
      select: { id: true, twitchLogin: true, twitchUserId: true },
    });

    return { status: "resolved", user };
  }

  if (
    existingUser.twitchUserId &&
    existingUser.twitchUserId !== identity.twitchUserId
  ) {
    return { status: "identity-conflict" };
  }

  if (existingUser.role === "ADMIN" && !existingUser.twitchUserId
    && process.env.UPMANDEX_ADMIN_TWITCH_ID !== identity.twitchUserId) {
    return { status: "identity-conflict" };
  }

  const user = await tx.user.update({
    where: { id: existingUser.id, AND: { twitchUserId: existingUser.twitchUserId, role: existingUser.role } },
    data: {
      twitchUserId: identity.twitchUserId,
      twitchLogin: identity.twitchLogin,
      displayName: identity.displayName,
      ...(identity.avatar !== undefined ? { avatar: identity.avatar } : {}),
    },
    select: { id: true, twitchLogin: true, twitchUserId: true },
  });

  return { status: "resolved", user };
}
