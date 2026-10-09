import "server-only";

import { Prisma } from "@/app/generated/prisma/client";
import type { ActiveEventUpmanConfig } from "@/app/admin/upmans/types";
import { prisma } from "@/lib/prisma";

const ANNIVERSARY_EVENT_SLUG = "anniversary";

export class ActiveEventUpmanConfigError extends Error {
  constructor(
    readonly code: "event-not-found" | "invalid-upman" | "reward-id-in-use" | "transaction-conflict"
  ) {
    super(code);
    this.name = "ActiveEventUpmanConfigError";
  }
}

type EventRedeemRule = {
  id: string;
  upmanId: string;
  externalKey: string | null;
  isEnabled: boolean;
  upman: { id: string; name: string };
};

function toConfig(event: {
  slug: string;
  name: string;
  isEnabled: boolean;
  acquisitionRules: EventRedeemRule[];
}): ActiveEventUpmanConfig {
  const selectedRule =
    event.acquisitionRules.find((rule) => rule.isEnabled) ??
    event.acquisitionRules[0] ??
    null;

  return {
    eventName: event.name,
    eventSlug: event.slug,
    selectedUpmanId: selectedRule?.upmanId ?? null,
    selectedUpmanName: selectedRule?.upman.name ?? null,
    rewardId: selectedRule?.externalKey ?? "",
    isActive: Boolean(event.isEnabled && selectedRule?.isEnabled && selectedRule.externalKey),
  };
}

const eventSelect = {
  slug: true,
  name: true,
  isEnabled: true,
  acquisitionRules: {
    where: { method: "EVENT_REDEEM" as const },
    orderBy: [{ isEnabled: "desc" as const }, { updatedAt: "desc" as const }],
    select: {
      id: true,
      upmanId: true,
      externalKey: true,
      isEnabled: true,
      upman: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.UpmanEventSelect;

export async function getActiveEventUpmanConfig(): Promise<ActiveEventUpmanConfig | null> {
  const event = await prisma.upmanEvent.findUnique({
    where: { slug: ANNIVERSARY_EVENT_SLUG },
    select: eventSelect,
  });

  return event ? toConfig(event) : null;
}

export async function saveActiveEventUpmanConfig(input: {
  upmanId: string | null;
  rewardId: string;
}): Promise<ActiveEventUpmanConfig> {
  try {
    return await prisma.$transaction(async (tx) => {
      const event = await tx.upmanEvent.findUnique({
        where: { slug: ANNIVERSARY_EVENT_SLUG },
        select: { id: true, ...eventSelect },
      });

      if (!event) {
        throw new ActiveEventUpmanConfigError("event-not-found");
      }

      const rules = event.acquisitionRules;

      if (!input.upmanId) {
        const retainedRule = rules[0] ?? null;
        if (input.rewardId && retainedRule) {
          const conflictingRule = await tx.upmanAcquisitionRule.findFirst({
            where: {
              method: "EVENT_REDEEM",
              externalKey: input.rewardId,
              id: { not: retainedRule.id },
            },
            select: { id: true },
          });
          if (conflictingRule) {
            throw new ActiveEventUpmanConfigError("reward-id-in-use");
          }
          await tx.upmanAcquisitionRule.update({
            where: { id: retainedRule.id },
            data: { externalKey: input.rewardId },
          });
        }

        await tx.upmanAcquisitionRule.updateMany({
          where: { eventId: event.id, method: "EVENT_REDEEM" },
          data: { isEnabled: false },
        });
        const updatedEvent = await tx.upmanEvent.update({
          where: { id: event.id },
          data: { isEnabled: false },
          select: eventSelect,
        });
        return toConfig(updatedEvent);
      }

      const upman = await tx.upman.findFirst({
        where: { id: input.upmanId, rarity: "Event" },
        select: { id: true },
      });
      if (!upman) {
        throw new ActiveEventUpmanConfigError("invalid-upman");
      }

      const ruleForReward = rules.find((rule) => rule.externalKey === input.rewardId);
      const selectedRule =
        ruleForReward ?? rules.find((rule) => rule.isEnabled) ?? rules[0] ?? null;

      const conflictingRule = await tx.upmanAcquisitionRule.findFirst({
        where: {
          method: "EVENT_REDEEM",
          externalKey: input.rewardId,
          ...(selectedRule ? { id: { not: selectedRule.id } } : {}),
        },
        select: { id: true },
      });
      if (conflictingRule) {
        throw new ActiveEventUpmanConfigError("reward-id-in-use");
      }

      await tx.upmanAcquisitionRule.updateMany({
        where: {
          eventId: event.id,
          method: "EVENT_REDEEM",
          ...(selectedRule ? { id: { not: selectedRule.id } } : {}),
        },
        data: { isEnabled: false },
      });

      if (selectedRule) {
        await tx.upmanAcquisitionRule.update({
          where: { id: selectedRule.id },
          data: {
            upmanId: upman.id,
            externalKey: input.rewardId,
            isEnabled: true,
          },
        });
      } else {
        await tx.upmanAcquisitionRule.create({
          data: {
            upmanId: upman.id,
            method: "EVENT_REDEEM",
            externalKey: input.rewardId,
            isEnabled: true,
            eventId: event.id,
          },
        });
      }

      const updatedEvent = await tx.upmanEvent.update({
        where: { id: event.id },
        data: { isEnabled: true },
        select: eventSelect,
      });
      return toConfig(updatedEvent);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof ActiveEventUpmanConfigError) {
      throw error;
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      throw new ActiveEventUpmanConfigError(
        error.code === "P2002" ? "reward-id-in-use" : "transaction-conflict"
      );
    }
    throw error;
  }
}
