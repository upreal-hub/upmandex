import type { Prisma } from "@/app/generated/prisma/client";

export const publicUpmanWhere = {
  dexVisibility: "PUBLIC",
} satisfies Prisma.UpmanWhereInput;

export const publicInventoryWhere = {
  upman: publicUpmanWhere,
} satisfies Prisma.InventoryWhereInput;

export function collectionUpmanWhere(ownerUserId: string): Prisma.UpmanWhereInput {
  return {
    OR: [
      publicUpmanWhere,
      { inventory: { some: { userId: ownerUserId } } },
    ],
  };
}

export function upmanDetailWhere(
  slug: string,
  viewerUserId: string | null,
): Prisma.UpmanWhereInput {
  return {
    slug,
    OR: [
      publicUpmanWhere,
      ...(viewerUserId ? [{ inventory: { some: { userId: viewerUserId } } }] : []),
    ],
  };
}

export function isPublicUpman(dexVisibility: string) {
  return dexVisibility === "PUBLIC";
}
