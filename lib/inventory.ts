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

export type RemoveUpmanResult =
  | { status: "removed"; upmanName: string; viewer: string }
  | { status: "not-owned"; upmanName: string; viewer: string }
  | { status: "viewer-not-found" }
  | { status: "upman-not-found" }
  | { status: "invalid-input" }
  | { status: "owners-count-inconsistent" }
  | { status: "transaction-conflict" };

class OwnersCountIntegrityError extends Error {
  constructor() {
    super("Upman owners count is inconsistent with inventory");
    this.name = "OwnersCountIntegrityError";
  }
}

function isTransactionConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function waitForTransactionRetry(attempt: number) {
  const delay = attempt === 1 ? 25 : 75;
  return new Promise<void>((resolve) => setTimeout(resolve, delay));
}

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

export async function removeUpman(
  input: Pick<GrantUpmanInput, "viewer" | "slug">
): Promise<RemoveUpmanResult> {
  const viewer = normalizeTwitchLogin(input.viewer);
  const slug = validateSlug(input.slug);

  if (!viewer || !slug) {
    return { status: "invalid-input" };
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const user = await tx.user.findUnique({
            where: { twitchLogin: viewer },
            select: { id: true },
          });

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

          const deleted = await tx.inventory.deleteMany({
            where: { userId: user.id, upmanId: upman.id },
          });

          if (deleted.count === 0) {
            return {
              status: "not-owned",
              upmanName: upman.name,
              viewer,
            };
          }

          if (deleted.count !== 1) {
            throw new OwnersCountIntegrityError();
          }

          const decremented = await tx.upman.updateMany({
            where: { id: upman.id, ownersCount: { gt: 0 } },
            data: { ownersCount: { decrement: 1 } },
          });

          if (decremented.count !== 1) {
            throw new OwnersCountIntegrityError();
          }

          // firstOwner is a historical record and deliberately remains immutable.
          return { status: "removed", upmanName: upman.name, viewer };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (error instanceof OwnersCountIntegrityError) {
        return { status: "owners-count-inconsistent" };
      }

      if (!isTransactionConflict(error)) {
        throw error;
      }

      if (attempt === 3) {
        return { status: "transaction-conflict" };
      }

      await waitForTransactionRetry(attempt);
    }
  }

  return { status: "transaction-conflict" };
}
