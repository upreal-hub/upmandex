import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin, validateSlug } from "@/lib/validation";

type GrantUpmanInput = {
  viewer: string;
  displayName: string;
  slug: string;
  autoCreateUser: boolean;
};

export type GrantUpmanResult =
  | { status: "granted"; upmanName: string; viewer: string }
  | { status: "already-owned"; upmanName: string; viewer: string }
  | { status: "viewer-not-found" }
  | { status: "upman-not-found" }
  | { status: "invalid-input" };

export async function grantUpman(
  input: GrantUpmanInput
): Promise<GrantUpmanResult> {
  const viewer = normalizeTwitchLogin(input.viewer);
  const slug = validateSlug(input.slug);

  if (!viewer || !slug) {
    return { status: "invalid-input" };
  }

  return prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({
      where: { twitchLogin: viewer },
      select: { id: true },
    });

    if (!user && input.autoCreateUser) {
      user = await tx.user.create({
        data: {
          twitchLogin: viewer,
          displayName: input.displayName.trim(),
          avatar: null,
        },
        select: { id: true },
      });
    }

    if (!user) {
      return { status: "viewer-not-found" };
    }

    const upman = await tx.upman.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!upman) {
      return { status: "upman-not-found" };
    }

    try {
      await tx.inventory.create({
        data: { userId: user.id, upmanId: upman.id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return {
          status: "already-owned",
          upmanName: upman.name,
          viewer,
        };
      }

      throw error;
    }

    await tx.upman.update({
      where: { id: upman.id },
      data: { ownersCount: { increment: 1 } },
    });

    await tx.upman.updateMany({
      where: { id: upman.id, firstOwner: null },
      data: { firstOwner: viewer },
    });

    return { status: "granted", upmanName: upman.name, viewer };
  });
}
