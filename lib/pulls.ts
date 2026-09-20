import { randomInt } from "crypto";

import { Prisma } from "@/app/generated/prisma/client";
import { createActivityLogData } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { resolveTwitchIdentity } from "@/lib/twitch-identity";

type PullViewer = {
  twitchUserId: string;
  twitchLogin: string;
  displayName: string;
};

type PullUpman = {
  id: string;
  slug: string;
  name: string;
  rarity: string;
  image: string;
  creator: string;
};

type PersistedPull = {
  result: "new" | "duplicate";
  viewer: {
    twitchLogin: string;
    displayName: string;
  };
  upman: Omit<PullUpman, "id">;
};

export type ResolvePullResult =
  | ({ status: "resolved"; idempotent: boolean } & PersistedPull)
  | { status: "identity-conflict" }
  | { status: "no-pullable-upman" }
  | { status: "transaction-conflict" };

type ResolvePullInput = {
  requestId: string;
  viewer: PullViewer;
};

type PullOptions = {
  randomInt?: (maxExclusive: number) => number;
};

const MAX_TRANSACTION_ATTEMPTS = 3;

function isRetryableTransactionError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2034" || error.code === "P2002")
  );
}

function waitForTransactionRetry(attempt: number) {
  const delay = attempt === 1 ? 25 : 75;
  return new Promise<void>((resolve) => setTimeout(resolve, delay));
}

function toPersistedPull(event: {
  result: "NEW" | "DUPLICATE";
  twitchLogin: string;
  displayName: string;
  upmanSlug: string;
  upmanName: string;
  upmanRarity: string;
  upmanImage: string;
  upmanCreator: string;
}): PersistedPull {
  return {
    result: event.result === "NEW" ? "new" : "duplicate",
    viewer: {
      twitchLogin: event.twitchLogin,
      displayName: event.displayName,
    },
    upman: {
      slug: event.upmanSlug,
      name: event.upmanName,
      rarity: event.upmanRarity,
      image: event.upmanImage,
      creator: event.upmanCreator,
    },
  };
}

function selectWeightedRarity(
  rules: { rarity: string; weight: number }[],
  pickRandomInt: (maxExclusive: number) => number
) {
  const totalWeight = rules.reduce((sum, rule) => sum + rule.weight, 0);

  if (!Number.isSafeInteger(totalWeight) || totalWeight <= 0) {
    return null;
  }

  const selectedWeight = pickRandomInt(totalWeight);
  if (selectedWeight < 0 || selectedWeight >= totalWeight) {
    throw new Error("Pull random source returned an invalid value");
  }

  let cursor = selectedWeight;
  for (const rule of rules) {
    if (cursor < rule.weight) {
      return rule.rarity;
    }
    cursor -= rule.weight;
  }

  return null;
}

export async function resolvePull(
  input: ResolvePullInput,
  options: PullOptions = {}
): Promise<ResolvePullResult> {
  const pickRandomInt = options.randomInt ?? randomInt;

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existingEvent = await tx.pullEvent.findUnique({
            where: { requestId: input.requestId },
            select: {
              result: true,
              twitchLogin: true,
              displayName: true,
              upmanSlug: true,
              upmanName: true,
              upmanRarity: true,
              upmanImage: true,
              upmanCreator: true,
            },
          });

          if (existingEvent) {
            return {
              status: "resolved" as const,
              idempotent: true,
              ...toPersistedPull(existingEvent),
            };
          }

          const viewerResult = await resolveTwitchIdentity(tx, input.viewer);
          if (viewerResult.status === "identity-conflict") {
            return viewerResult;
          }

          const activeRules = await tx.pullRarityRule.findMany({
            where: { enabled: true, weight: { gt: 0 } },
            select: { rarity: true, weight: true },
            orderBy: { rarity: "asc" },
          });

          if (activeRules.length === 0) {
            return { status: "no-pullable-upman" as const };
          }

          const candidates = await tx.upman.findMany({
            where: {
              isPullable: true,
              rarity: { in: activeRules.map((rule) => rule.rarity) },
            },
            select: {
              id: true,
              slug: true,
              name: true,
              rarity: true,
              image: true,
              creator: true,
            },
            orderBy: { slug: "asc" },
          });

          const availableRarities = new Set(candidates.map((upman) => upman.rarity));
          const eligibleRules = activeRules.filter((rule) => availableRarities.has(rule.rarity));
          const selectedRarity = selectWeightedRarity(eligibleRules, pickRandomInt);

          if (!selectedRarity) {
            return { status: "no-pullable-upman" as const };
          }

          const rarityCandidates = candidates.filter((upman) => upman.rarity === selectedRarity);
          const upman = rarityCandidates[pickRandomInt(rarityCandidates.length)] as PullUpman;

          const inventory = await tx.inventory.findUnique({
            where: {
              userId_upmanId: {
                userId: viewerResult.user.id,
                upmanId: upman.id,
              },
            },
            select: { id: true },
          });

          const result = inventory ? "DUPLICATE" : "NEW";

          if (!inventory) {
            await tx.inventory.create({
              data: { userId: viewerResult.user.id, upmanId: upman.id },
            });

            await tx.upman.update({
              where: { id: upman.id },
              data: { ownersCount: { increment: 1 } },
            });

            await tx.upman.updateMany({
              where: { id: upman.id, firstOwner: null },
              data: { firstOwner: viewerResult.user.twitchLogin },
            });
          }

          await tx.pullEvent.create({
            data: {
              requestId: input.requestId,
              result,
              origin: "STREAMERBOT",
              userId: viewerResult.user.id,
              twitchUserId: input.viewer.twitchUserId,
              twitchLogin: viewerResult.user.twitchLogin,
              displayName: input.viewer.displayName,
              upmanId: upman.id,
              upmanSlug: upman.slug,
              upmanName: upman.name,
              upmanRarity: upman.rarity,
              upmanImage: upman.image,
              upmanCreator: upman.creator,
            },
          });

          await tx.activityLog.create({
            data: createActivityLogData({
              action: "PULL_RESOLVED",
              context: { origin: "STREAMERBOT" },
              target: {
                id: viewerResult.user.id,
                twitchLogin: viewerResult.user.twitchLogin,
              },
              upman,
              metadata: {
                requestId: input.requestId,
                result: result === "NEW" ? "new" : "duplicate",
                twitchUserId: input.viewer.twitchUserId,
              },
            }),
          });

          if (result === "NEW") {
            await tx.activityLog.create({
              data: createActivityLogData({
                action: "UPMAN_GRANTED",
                context: { origin: "STREAMERBOT" },
                target: {
                  id: viewerResult.user.id,
                  twitchLogin: viewerResult.user.twitchLogin,
                },
                upman,
              }),
            });
          }

          return {
            status: "resolved" as const,
            idempotent: false,
            result: result === "NEW" ? "new" : "duplicate",
            viewer: {
              twitchLogin: viewerResult.user.twitchLogin,
              displayName: input.viewer.displayName,
            },
            upman: {
              slug: upman.slug,
              name: upman.name,
              rarity: upman.rarity,
              image: upman.image,
              creator: upman.creator,
            },
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (!isRetryableTransactionError(error)) {
        throw error;
      }

      if (attempt === MAX_TRANSACTION_ATTEMPTS) {
        return { status: "transaction-conflict" };
      }

      await waitForTransactionRetry(attempt);
    }
  }

  return { status: "transaction-conflict" };
}
