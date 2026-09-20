import "server-only";

import { Prisma } from "@/app/generated/prisma/client";

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
  identity: TwitchIdentityInput
): Promise<TwitchIdentityResolution> {
  const [userByTwitchId, userByLogin] = await Promise.all([
    tx.user.findUnique({
      where: { twitchUserId: identity.twitchUserId },
      select: { id: true, twitchUserId: true, twitchLogin: true },
    }),
    tx.user.findUnique({
      where: { twitchLogin: identity.twitchLogin },
      select: { id: true, twitchUserId: true, twitchLogin: true },
    }),
  ]);

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

  const user = await tx.user.update({
    where: { id: existingUser.id },
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
