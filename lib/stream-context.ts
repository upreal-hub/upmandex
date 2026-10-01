import "server-only";

import { prisma } from "@/lib/prisma";

export const STREAM_CONTEXT_ID = "current";
export const STREAM_CONTEXT_TTL_MS = 5 * 60 * 1000;

export type StreamContextUpdate =
  | { isOnline: false; twitchCategoryId: null; twitchCategoryName: null }
  | { isOnline: true; twitchCategoryId: string; twitchCategoryName: string | null };

function normalizeRequiredCategoryId(value: string) {
  const categoryId = value.trim();
  return /^[1-9][0-9]{0,29}$/.test(categoryId) ? categoryId : null;
}

export async function updateStreamContext(input: StreamContextUpdate) {
  return prisma.streamContext.upsert({
    where: { id: STREAM_CONTEXT_ID },
    create: {
      id: STREAM_CONTEXT_ID,
      isOnline: input.isOnline,
      twitchCategoryId: input.twitchCategoryId,
      twitchCategoryName: input.twitchCategoryName,
    },
    update: {
      isOnline: input.isOnline,
      twitchCategoryId: input.twitchCategoryId,
      twitchCategoryName: input.twitchCategoryName,
    },
    select: {
      isOnline: true,
      twitchCategoryId: true,
      twitchCategoryName: true,
      updatedAt: true,
    },
  });
}

export async function isRequiredStreamCategoryActive(
  requiredCategoryId: string,
  now = new Date()
) {
  const categoryId = normalizeRequiredCategoryId(requiredCategoryId);
  if (!categoryId) {
    return false;
  }

  const context = await prisma.streamContext.findUnique({
    where: { id: STREAM_CONTEXT_ID },
    select: { isOnline: true, twitchCategoryId: true, updatedAt: true },
  });

  if (!context?.isOnline || context.twitchCategoryId !== categoryId) {
    return false;
  }

  const ageMs = now.getTime() - context.updatedAt.getTime();
  return ageMs >= 0 && ageMs <= STREAM_CONTEXT_TTL_MS;
}
