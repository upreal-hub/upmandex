import "server-only";

import { randomUUID } from "node:crypto";

import { del, put } from "@vercel/blob";
import { ProfileCosmeticAssetType } from "@/app/generated/prisma/client";
import { createActivityLogData, type ActivityActor } from "@/lib/activity";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_NAME_LENGTH = 80;
const EXTENSIONS = /\.(png|jpe?g|webp)$/i;

export class ProfileCosmeticError extends Error {
  constructor(public readonly status: 400 | 404 | 500, message: string) {
    super(message);
  }
}

export function parseProfileCosmeticType(value: unknown): ProfileCosmeticAssetType | null {
  return value === "BACKGROUND" || value === "BANNER" ? value : null;
}

export function validateProfileCosmeticName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length > 0 && name.length <= MAX_NAME_LENGTH ? name : null;
}

function read24(bytes: Uint8Array, offset: number) { return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16); }
function read32(bytes: Uint8Array, offset: number) { return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0; }

function dimensions(bytes: Uint8Array, type: string) {
  if (type === "image/png" && bytes.length >= 24 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && String.fromCharCode(...bytes.slice(12, 16)) === "IHDR") {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { extension: "png", contentType: "image/png" as const, width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (type === "image/jpeg" && bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      while (bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda || offset + 1 >= bytes.length) return null;
      if (marker >= 0xd0 && marker <= 0xd7) continue;
      const length = (bytes[offset] << 8) | bytes[offset + 1];
      if (length < 2 || offset + length > bytes.length) return null;
      const sof = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
      if (sof && length >= 8) return { extension: "jpg", contentType: "image/jpeg" as const, height: (bytes[offset + 3] << 8) | bytes[offset + 4], width: (bytes[offset + 5] << 8) | bytes[offset + 6] };
      offset += length;
    }
  }
  if (type === "image/webp" && bytes.length >= 30 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === "VP8X") return { extension: "webp", contentType: "image/webp" as const, width: 1 + read24(bytes, 24), height: 1 + read24(bytes, 27) };
    if (chunk === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return { extension: "webp", contentType: "image/webp" as const, width: bytes[26] | ((bytes[27] & 0x3f) << 8), height: bytes[28] | ((bytes[29] & 0x3f) << 8) };
    if (chunk === "VP8L" && bytes[20] === 0x2f) { const bits = read32(bytes, 21); return { extension: "webp", contentType: "image/webp" as const, width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) }; }
  }
  return null;
}

async function validateImage(file: File, type: ProfileCosmeticAssetType) {
  if (file.size === 0 || file.size > MAX_BYTES) throw new ProfileCosmeticError(400, "Image must be no larger than 5 MiB");
  const image = dimensions(new Uint8Array(await file.arrayBuffer()), file.type);
  const maxHeight = type === "BANNER" ? 2048 : 4096;
  const maxPixels = type === "BANNER" ? 8_000_000 : 16_000_000;
  if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 || image.width > 4096 || image.height > maxHeight || image.width * image.height > maxPixels) {
    throw new ProfileCosmeticError(400, type === "BANNER" ? "Choose a valid PNG, JPEG, or WebP banner up to 4096 × 2048 pixels" : "Choose a valid PNG, JPEG, or WebP background up to 4096 × 4096 pixels");
  }
  return image;
}

function prefix(type: ProfileCosmeticAssetType) { return type === "BACKGROUND" ? "profile-cosmetics/backgrounds/" : "profile-cosmetics/banners/"; }
function blobPath(type: ProfileCosmeticAssetType, extension: string) { return `${prefix(type)}${randomUUID()}.${extension}`; }

export function isManagedProfileCosmeticBlobUrl(value: string, type: ProfileCosmeticAssetType): boolean {
  const storeId = process.env.BLOB_STORE_ID;
  if (!storeId) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === `${storeId}.public.blob.vercel-storage.com` && url.port === "" && url.pathname.startsWith(`/${prefix(type)}`) && EXTENSIONS.test(url.pathname) && url.search === "" && url.hash === "";
  } catch { return false; }
}

async function cleanup(url: string, type: ProfileCosmeticAssetType) {
  if (!isManagedProfileCosmeticBlobUrl(url, type)) return false;
  try { await del(url); return false; } catch { return true; }
}

function metadata(asset: { id: string; name: string; type: ProfileCosmeticAssetType }, cleanupWarning?: boolean) {
  return { assetId: asset.id, assetName: asset.name, assetType: asset.type, ...(cleanupWarning ? { cleanupWarning } : {}) };
}

export async function listProfileCosmetics() {
  return prisma.profileCosmeticAsset.findMany({ orderBy: [{ type: "asc" }, { createdAt: "asc" }, { id: "asc" }] });
}

export async function createProfileCosmetic(input: { type: ProfileCosmeticAssetType; name: string; file: File; actor: ActivityActor }) {
  if (!process.env.BLOB_STORE_ID) throw new ProfileCosmeticError(500, "Profile cosmetic storage is not configured");
  const image = await validateImage(input.file, input.type);
  const blob = await put(blobPath(input.type, image.extension), input.file, { access: "public", addRandomSuffix: false, contentType: image.contentType });
  try {
    return await prisma.$transaction(async (tx) => {
      const asset = await tx.profileCosmeticAsset.create({ data: { type: input.type, name: input.name, image: blob.url } });
      await tx.activityLog.create({ data: createActivityLogData({ action: "PROFILE_COSMETIC_CREATED", context: { origin: "ADMIN", actor: input.actor }, metadata: metadata(asset) }) });
      return asset;
    });
  } catch (error) { await cleanup(blob.url, input.type); throw error; }
}

export async function renameProfileCosmetic(id: string, name: string, actor: ActivityActor) {
  const existing = await prisma.profileCosmeticAsset.findUnique({ where: { id } });
  if (!existing) throw new ProfileCosmeticError(404, "Profile cosmetic not found");
  return prisma.$transaction(async (tx) => {
    const asset = await tx.profileCosmeticAsset.update({ where: { id }, data: { name } });
    await tx.activityLog.create({ data: createActivityLogData({ action: "PROFILE_COSMETIC_UPDATED", context: { origin: "ADMIN", actor }, metadata: metadata(asset) }) });
    return asset;
  });
}

export async function replaceProfileCosmetic(id: string, file: File, actor: ActivityActor) {
  const existing = await prisma.profileCosmeticAsset.findUnique({ where: { id } });
  if (!existing) throw new ProfileCosmeticError(404, "Profile cosmetic not found");
  if (!process.env.BLOB_STORE_ID) throw new ProfileCosmeticError(500, "Profile cosmetic storage is not configured");
  const image = await validateImage(file, existing.type);
  const blob = await put(blobPath(existing.type, image.extension), file, { access: "public", addRandomSuffix: false, contentType: image.contentType });
  let asset;
  try {
    asset = await prisma.$transaction(async (tx) => {
      const updated = await tx.profileCosmeticAsset.update({ where: { id }, data: { image: blob.url } });
      await tx.activityLog.create({ data: createActivityLogData({ action: "PROFILE_COSMETIC_UPDATED", context: { origin: "ADMIN", actor }, metadata: metadata(updated) }) });
      return updated;
    });
  } catch (error) { await cleanup(blob.url, existing.type); throw error; }
  const cleanupWarning = await cleanup(existing.image, existing.type);
  return { asset, cleanupWarning };
}

export async function deleteProfileCosmetic(id: string, actor: ActivityActor) {
  const existing = await prisma.profileCosmeticAsset.findUnique({ where: { id } });
  if (!existing) throw new ProfileCosmeticError(404, "Profile cosmetic not found");
  await prisma.$transaction(async (tx) => {
    await tx.profileCosmeticAsset.delete({ where: { id } });
    await tx.activityLog.create({ data: createActivityLogData({ action: "PROFILE_COSMETIC_DELETED", context: { origin: "ADMIN", actor }, metadata: metadata(existing) }) });
  });
  return { cleanupWarning: await cleanup(existing.image, existing.type) };
}
