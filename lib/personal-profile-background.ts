import "server-only";

import { randomUUID } from "node:crypto";

import { del, put } from "@vercel/blob";
import { ProfileCosmeticAssetType } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validateProfileCosmeticImage } from "@/lib/profile-cosmetics";
import { normalizeTwitchLogin } from "@/lib/validation";

const PREFIX = "personal-profile-backgrounds/";
const EXTENSIONS = /\.(png|jpe?g|webp)$/i;

/**
 * Keeps deployed code compatible with the existing Anniversary schema until
 * the personal-background migration has been deliberately applied. This is a
 * read-only metadata query, not a broad Prisma-error fallback.
 */
export async function isPersonalProfileBackgroundSchemaAvailable() {
  const rows = await prisma.$queryRaw<Array<{ available: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'ProfileCosmeticAsset'
        AND column_name = 'ownerUserId'
    ) AS "available"
  `;
  return rows[0]?.available === true;
}

export class PersonalProfileBackgroundError extends Error {
  constructor(public readonly status: 400 | 401 | 403 | 404 | 500, message: string) {
    super(message);
  }
}

type Owner = { user: { id: string }; person: { id: string; userId: string | null } };

async function getOwner(personId: string): Promise<Owner> {
  const login = normalizeTwitchLogin((await auth())?.user?.name);
  if (!login) throw new PersonalProfileBackgroundError(401, "Authentication required");
  const user = await prisma.user.findUnique({ where: { twitchLogin: login }, select: { id: true } });
  if (!user) throw new PersonalProfileBackgroundError(403, "Your Twitch account is not available");
  const person = await prisma.person.findUnique({ where: { id: personId }, select: { id: true, userId: true } });
  if (!person) throw new PersonalProfileBackgroundError(404, "Person not found");
  if (person.userId !== user.id) throw new PersonalProfileBackgroundError(403, "You can only manage your own background");
  return { user, person };
}

function path(extension: string) {
  return `${PREFIX}${randomUUID()}.${extension}`;
}

function isManagedUrl(value: string) {
  const storeId = process.env.BLOB_STORE_ID;
  if (!storeId) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === `${storeId}.public.blob.vercel-storage.com` && url.port === "" && url.pathname.startsWith(`/${PREFIX}`) && EXTENSIONS.test(url.pathname) && !url.search && !url.hash;
  } catch {
    return false;
  }
}

async function deleteBlobSafely(url: string) {
  if (!isManagedUrl(url)) return false;
  try {
    await del(url);
    return false;
  } catch {
    return true;
  }
}

export async function getPersonalProfileBackground(personId: string) {
  const owner = await getOwner(personId);
  return prisma.profileCosmeticAsset.findUnique({
    where: { ownerUserId_type: { ownerUserId: owner.user.id, type: ProfileCosmeticAssetType.BACKGROUND } },
    select: { id: true, type: true, name: true, image: true, ownerUserId: true },
  });
}

export async function uploadPersonalProfileBackground(personId: string, file: File) {
  const [owner, image] = await Promise.all([getOwner(personId), validateProfileCosmeticImage(file, ProfileCosmeticAssetType.BACKGROUND)]);
  if (!process.env.BLOB_STORE_ID) throw new PersonalProfileBackgroundError(500, "Background storage is not configured");
  const blob = await put(path(image.extension), file, { access: "public", addRandomSuffix: false, contentType: image.contentType });
  let previousImage: string | null = null;
  try {
    const asset = await prisma.$transaction(async (tx) => {
      const existing = await tx.profileCosmeticAsset.findUnique({
        where: { ownerUserId_type: { ownerUserId: owner.user.id, type: ProfileCosmeticAssetType.BACKGROUND } },
        select: { id: true, image: true },
      });
      previousImage = existing?.image ?? null;
      if (existing) {
        return tx.profileCosmeticAsset.update({
          where: { id: existing.id },
          data: { image: blob.url, name: "My custom background" },
          select: { id: true, type: true, name: true, image: true, ownerUserId: true },
        });
      }
      return tx.profileCosmeticAsset.create({
        data: { type: ProfileCosmeticAssetType.BACKGROUND, name: "My custom background", image: blob.url, ownerUserId: owner.user.id },
        select: { id: true, type: true, name: true, image: true, ownerUserId: true },
      });
    });
    const cleanupWarning = previousImage ? await deleteBlobSafely(previousImage) : false;
    return { asset, cleanupWarning };
  } catch (error) {
    await deleteBlobSafely(blob.url);
    throw error;
  }
}

export async function deletePersonalProfileBackground(personId: string) {
  const owner = await getOwner(personId);
  const asset = await prisma.profileCosmeticAsset.findUnique({
    where: { ownerUserId_type: { ownerUserId: owner.user.id, type: ProfileCosmeticAssetType.BACKGROUND } },
  });
  if (!asset) throw new PersonalProfileBackgroundError(404, "No personal background found");
  await prisma.$transaction(async (tx) => {
    await tx.person.updateMany({ where: { userId: owner.user.id, equippedCustomBackgroundId: asset.id }, data: { equippedCustomBackgroundId: null } });
    await tx.profileCosmeticAsset.delete({ where: { id: asset.id } });
  });
  return { cleanupWarning: await deleteBlobSafely(asset.image) };
}
