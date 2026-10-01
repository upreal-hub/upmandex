import "server-only";

import { Prisma, type ActivityOrigin } from "@/app/generated/prisma/client";
import { createActivityLogData, type ActivityActor } from "@/lib/activity";
import { safelySyncLinkedPersonAchievementsByLogin } from "@/lib/achievements";
import { grantResolvedUpman } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { getStreamCommandCategoryRequirement } from "@/lib/secret-upman-config";
import { isRequiredStreamCategoryActive } from "@/lib/stream-context";
import { resolveTwitchIdentity, type TwitchIdentityInput } from "@/lib/twitch-identity";
import { normalizeTwitchLogin } from "@/lib/validation";

const MAX_TRANSACTION_ATTEMPTS = 3;
const TWITCH_USER_ID_PATTERN = /^[1-9][0-9]{0,29}$/;
const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9:_-]{1,180}$/;

export type UpmanAcquisitionContext = {
  origin: ActivityOrigin;
  actor?: ActivityActor | null;
  verifiedTwitchCategoryId?: string | null;
};

type AcquisitionUpman = {
  slug: string;
  name: string;
};

type ResolvedAcquisition = {
  status: "resolved";
  idempotent: boolean;
  result: "new" | "duplicate";
  viewer: { twitchLogin: string; displayName: string };
  upman: AcquisitionUpman;
};

export type ResolveUpmanAcquisitionResult =
  | ResolvedAcquisition
  | { status: "invalid-input" }
  | { status: "identity-conflict" }
  | { status: "rule-not-found" }
  | { status: "rule-unavailable" }
  | { status: "required-category-mismatch" }
  | { status: "transaction-conflict" };

export type ResolveUpmanAcquisitionInput = {
  ruleId: string;
  idempotencyKey: string;
  viewer: TwitchIdentityInput;
  context: UpmanAcquisitionContext;
};

export type ResolveEventRedeemInput = {
  rewardId: string;
  redemptionId: string;
  viewer: TwitchIdentityInput;
  context: UpmanAcquisitionContext;
};

export type ResolveStreamCommandInput = {
  commandKey: string;
  messageId: string;
  viewer: TwitchIdentityInput;
  context: UpmanAcquisitionContext;
};

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

function normaliseInput(input: ResolveUpmanAcquisitionInput) {
  const twitchLogin = normalizeTwitchLogin(input.viewer.twitchLogin);
  const displayName = input.viewer.displayName.trim();
  const ruleId = input.ruleId.trim();
  const idempotencyKey = input.idempotencyKey.trim();

  if (
    !twitchLogin ||
    !TWITCH_USER_ID_PATTERN.test(input.viewer.twitchUserId) ||
    !displayName ||
    displayName.length > 120 ||
    !/^[a-z0-9]+$/i.test(ruleId) ||
    ruleId.length > 64 ||
    !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)
  ) {
    return null;
  }

  return {
    ruleId,
    idempotencyKey,
    viewer: {
      twitchUserId: input.viewer.twitchUserId,
      twitchLogin,
      displayName,
      ...(input.viewer.avatar !== undefined ? { avatar: input.viewer.avatar } : {}),
    },
  };
}

function eventIsAvailable(event: {
  isEnabled: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
} | null, now: Date) {
  return !event || (
    event.isEnabled &&
    (!event.startsAt || event.startsAt <= now) &&
    (!event.endsAt || event.endsAt > now)
  );
}

function persistedResult(grant: {
  result: "NEW" | "DUPLICATE";
  twitchLogin: string;
  displayName: string;
  upman: AcquisitionUpman;
}): ResolvedAcquisition {
  return {
    status: "resolved",
    idempotent: true,
    result: grant.result === "NEW" ? "new" : "duplicate",
    viewer: {
      twitchLogin: grant.twitchLogin,
      displayName: grant.displayName,
    },
    upman: grant.upman,
  };
}

export async function resolveUpmanAcquisition(
  input: ResolveUpmanAcquisitionInput
): Promise<ResolveUpmanAcquisitionResult> {
  const normalized = normaliseInput(input);
  if (!normalized) {
    return { status: "invalid-input" };
  }

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      const result = await prisma.$transaction<ResolveUpmanAcquisitionResult>(
        async (tx) => {
          const existing = await tx.upmanAcquisitionGrant.findUnique({
            where: { idempotencyKey: normalized.idempotencyKey },
            select: {
              result: true,
              twitchLogin: true,
              displayName: true,
              upman: { select: { slug: true, name: true } },
            },
          });

          if (existing) {
            return persistedResult(existing);
          }

          const rule = await tx.upmanAcquisitionRule.findUnique({
            where: { id: normalized.ruleId },
            select: {
              id: true,
              method: true,
              isEnabled: true,
              requiredTwitchCategoryId: true,
              event: { select: { isEnabled: true, startsAt: true, endsAt: true } },
              upman: { select: { id: true, slug: true, name: true } },
            },
          });

          if (!rule) {
            return { status: "rule-not-found" };
          }

          if (!rule.isEnabled || !eventIsAvailable(rule.event, new Date())) {
            return { status: "rule-unavailable" };
          }

          const categoryRequirement =
            rule.method === "STREAM_COMMAND"
              ? getStreamCommandCategoryRequirement({
                  upmanSlug: rule.upman.slug,
                  requiredTwitchCategoryId: rule.requiredTwitchCategoryId,
                })
              : {
                  configured: true,
                  requiredTwitchCategoryId: rule.requiredTwitchCategoryId,
                };

          if (!categoryRequirement.configured) {
            return { status: "rule-unavailable" };
          }

          if (
            categoryRequirement.requiredTwitchCategoryId &&
            input.context.verifiedTwitchCategoryId !==
              categoryRequirement.requiredTwitchCategoryId
          ) {
            return { status: "required-category-mismatch" };
          }

          const identity = await resolveTwitchIdentity(tx, normalized.viewer);
          if (identity.status === "identity-conflict") {
            return identity;
          }

          const inventoryResult = await grantResolvedUpman(
            tx,
            {
              user: identity.user,
              upman: rule.upman,
            }
          );
          const result = inventoryResult.status === "granted" ? "NEW" : "DUPLICATE";

          await tx.activityLog.create({
            data: createActivityLogData({
              action: "UPMAN_ACQUISITION_RESOLVED",
              context: input.context,
              target: identity.user,
              upman: rule.upman,
              metadata: {
                idempotencyKey: normalized.idempotencyKey,
                acquisitionMethod: rule.method,
                result: result === "NEW" ? "new" : "duplicate",
              },
            }),
          });

          if (inventoryResult.status === "granted") {
            await tx.activityLog.create({
              data: createActivityLogData({
                action: "UPMAN_GRANTED",
                context: input.context,
                target: identity.user,
                upman: rule.upman,
              }),
            });
          }

          await tx.upmanAcquisitionGrant.create({
            data: {
              idempotencyKey: normalized.idempotencyKey,
              ruleId: rule.id,
              userId: identity.user.id,
              upmanId: rule.upman.id,
              twitchUserId: normalized.viewer.twitchUserId,
              twitchLogin: identity.user.twitchLogin,
              displayName: normalized.viewer.displayName,
              result,
            },
          });

          return {
            status: "resolved",
            idempotent: false,
            result: result === "NEW" ? "new" : "duplicate",
            viewer: {
              twitchLogin: identity.user.twitchLogin,
              displayName: normalized.viewer.displayName,
            },
            upman: {
              slug: rule.upman.slug,
              name: rule.upman.name,
            },
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      if (result.status === "resolved" && !result.idempotent && result.result === "new") {
        await safelySyncLinkedPersonAchievementsByLogin(result.viewer.twitchLogin);
      }

      return result;
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

export async function resolveEventRedeem(
  input: ResolveEventRedeemInput
): Promise<ResolveUpmanAcquisitionResult> {
  const idempotencyKey = `event-redeem:${input.redemptionId}`;
  const existingGrant = await prisma.upmanAcquisitionGrant.findUnique({
    where: { idempotencyKey },
    select: { ruleId: true, rule: { select: { method: true } } },
  });

  if (existingGrant && existingGrant.rule.method !== "EVENT_REDEEM") {
    return { status: "rule-not-found" };
  }

  const rule = existingGrant
    ? { id: existingGrant.ruleId }
    : await prisma.upmanAcquisitionRule.findFirst({
        where: {
          method: "EVENT_REDEEM",
          externalKey: input.rewardId,
        },
        select: { id: true },
      });

  if (!rule) {
    return { status: "rule-not-found" };
  }

  return resolveUpmanAcquisition({
    ruleId: rule.id,
    idempotencyKey,
    viewer: input.viewer,
    context: input.context,
  });
}

export async function resolveStreamCommand(
  input: ResolveStreamCommandInput
): Promise<ResolveUpmanAcquisitionResult> {
  const commandKey = input.commandKey.trim().toLowerCase();
  const messageId = input.messageId.trim().toLowerCase();
  if (
    !/^[a-z0-9][a-z0-9:_-]{0,79}$/.test(commandKey) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(messageId)
  ) {
    return { status: "invalid-input" };
  }

  const idempotencyKey = `stream-command:${messageId}`;
  const existingGrant = await prisma.upmanAcquisitionGrant.findUnique({
    where: { idempotencyKey },
    select: { ruleId: true, rule: { select: { method: true } } },
  });

  if (existingGrant && existingGrant.rule.method !== "STREAM_COMMAND") {
    return { status: "rule-not-found" };
  }

  if (existingGrant) {
    return resolveUpmanAcquisition({
      ruleId: existingGrant.ruleId,
      idempotencyKey,
      viewer: input.viewer,
      context: input.context,
    });
  }

  const rule = await prisma.upmanAcquisitionRule.findFirst({
    where: {
      method: "STREAM_COMMAND",
      externalKey: commandKey,
    },
    select: {
      id: true,
      requiredTwitchCategoryId: true,
      upman: { select: { slug: true } },
    },
  });

  if (!rule) {
    return { status: "rule-not-found" };
  }

  const categoryRequirement = getStreamCommandCategoryRequirement({
    upmanSlug: rule.upman.slug,
    requiredTwitchCategoryId: rule.requiredTwitchCategoryId,
  });

  if (!categoryRequirement.configured) {
    return { status: "rule-unavailable" };
  }

  if (
    categoryRequirement.requiredTwitchCategoryId &&
    !(await isRequiredStreamCategoryActive(
      categoryRequirement.requiredTwitchCategoryId
    ))
  ) {
    return { status: "required-category-mismatch" };
  }

  return resolveUpmanAcquisition({
    ruleId: rule.id,
    idempotencyKey,
    viewer: input.viewer,
    context: {
      ...input.context,
      verifiedTwitchCategoryId: categoryRequirement.requiredTwitchCategoryId,
    },
  });
}
