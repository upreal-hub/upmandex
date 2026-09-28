import "server-only";

import { randomUUID } from "node:crypto";

import { del, put } from "@vercel/blob";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin, validateArtworkTitle } from "@/lib/validation";

export const PERSON_ART_MAX_BYTES = 5 * 1024 * 1024;
export const PERSON_ART_MAX_DIMENSION = 4096;
export const PERSON_ART_MAX_PIXELS = 16_000_000;

type ArtworkFormat = "png" | "jpeg" | "webp";

type ValidatedArtworkImage = {
  format: ArtworkFormat;
  extension: "png" | "jpg" | "webp";
  contentType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
};

type ArtworkOwner = {
  person: { id: string; displayName: string; isPublic: boolean };
  user: { id: string; twitchLogin: string };
};

export class PersonArtworkError extends Error {
  constructor(public readonly status: 400 | 401 | 403 | 404 | 500, message: string) {
    super(message);
  }
}

function readUInt24LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readUInt32LE(bytes: Uint8Array, offset: number) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function imageDimensionsAreAllowed(width: number, height: number) {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0 &&
    width <= PERSON_ART_MAX_DIMENSION &&
    height <= PERSON_ART_MAX_DIMENSION &&
    width * height <= PERSON_ART_MAX_PIXELS
  );
}

function getPngDimensions(bytes: Uint8Array) {
  if (
    bytes.length < 24 ||
    bytes[0] !== 137 ||
    bytes[1] !== 80 ||
    bytes[2] !== 78 ||
    bytes[3] !== 71 ||
    bytes[4] !== 13 ||
    bytes[5] !== 10 ||
    bytes[6] !== 26 ||
    bytes[7] !== 10 ||
    String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR"
  ) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function getJpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (offset + 1 >= bytes.length) return null;

    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame && length >= 8) {
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }

    offset += length;
  }

  return null;
}

function getWebpDimensions(bytes: Uint8Array) {
  if (
    bytes.length < 30 ||
    String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" ||
    String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP"
  ) {
    return null;
  }

  const chunk = String.fromCharCode(...bytes.slice(12, 16));
  if (chunk === "VP8X") {
    return { width: 1 + readUInt24LE(bytes, 24), height: 1 + readUInt24LE(bytes, 27) };
  }
  if (chunk === "VP8 ") {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    return { width: bytes[26] | ((bytes[27] & 0x3f) << 8), height: bytes[28] | ((bytes[29] & 0x3f) << 8) };
  }
  if (chunk === "VP8L" && bytes[20] === 0x2f) {
    const bits = readUInt32LE(bytes, 21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }

  return null;
}

export async function validatePersonArtworkImage(file: File): Promise<ValidatedArtworkImage> {
  if (file.size === 0 || file.size > PERSON_ART_MAX_BYTES) {
    throw new PersonArtworkError(400, "Artwork must be no larger than 5 MiB");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let format: ArtworkFormat | null = null;
  let dimensions: { width: number; height: number } | null = null;

  if (file.type === "image/png") {
    format = "png";
    dimensions = getPngDimensions(bytes);
  } else if (file.type === "image/jpeg") {
    format = "jpeg";
    dimensions = getJpegDimensions(bytes);
  } else if (file.type === "image/webp") {
    format = "webp";
    dimensions = getWebpDimensions(bytes);
  }

  if (!format || !dimensions || !imageDimensionsAreAllowed(dimensions.width, dimensions.height)) {
    throw new PersonArtworkError(400, "Choose a valid PNG, JPEG, or WebP artwork up to 4096 × 4096 pixels");
  }

  const details: Record<ArtworkFormat, Omit<ValidatedArtworkImage, "width" | "height">> = {
    png: { format: "png", extension: "png", contentType: "image/png" },
    jpeg: { format: "jpeg", extension: "jpg", contentType: "image/jpeg" },
    webp: { format: "webp", extension: "webp", contentType: "image/webp" },
  };

  return { ...details[format], ...dimensions };
}

export function getPersonArtworkBlobPath(personId: string, extension: ValidatedArtworkImage["extension"]) {
  return `artworks/${personId}/${randomUUID()}.${extension}`;
}

export function isManagedPersonArtworkBlobUrl(value: string, personId: string): boolean {
  const storeId = process.env.BLOB_STORE_ID;
  if (!storeId) return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === `${storeId}.public.blob.vercel-storage.com` &&
      url.port === "" &&
      url.pathname.startsWith(`/artworks/${personId}/`) &&
      /\.(png|jpe?g|webp)$/i.test(url.pathname) &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}

async function getPersonArtworkOwner(personId: string): Promise<ArtworkOwner> {
  const sessionLogin = normalizeTwitchLogin((await auth())?.user?.name);
  if (!sessionLogin) throw new PersonArtworkError(401, "Authentication required");

  const user = await prisma.user.findUnique({
    where: { twitchLogin: sessionLogin },
    select: { id: true, twitchLogin: true },
  });
  if (!user) throw new PersonArtworkError(403, "You can only manage your own art");

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true, displayName: true, isPublic: true, userId: true },
  });
  if (!person) throw new PersonArtworkError(404, "Person not found");
  if (person.userId !== user.id) throw new PersonArtworkError(403, "You can only manage your own art");

  return { person: { id: person.id, displayName: person.displayName, isPublic: person.isPublic }, user };
}

async function cleanupArtworkBlob(url: string, personId: string) {
  if (!isManagedPersonArtworkBlobUrl(url, personId)) return;
  try {
    await del(url);
  } catch {
    console.error("Unable to clean up the uploaded Person artwork.");
  }
}

export async function uploadPersonArtwork(personId: string, file: File, titleInput: unknown) {
  const title = validateArtworkTitle(titleInput);
  if (title === undefined) throw new PersonArtworkError(400, "Artwork title must be 120 characters or fewer");

  const [owner, image] = await Promise.all([getPersonArtworkOwner(personId), validatePersonArtworkImage(file)]);
  if (!process.env.BLOB_STORE_ID) {
    throw new PersonArtworkError(500, "Artwork storage is not configured");
  }
  const blob = await put(getPersonArtworkBlobPath(owner.person.id, image.extension), file, {
    access: "public",
    addRandomSuffix: false,
    contentType: image.contentType,
  });

  try {
    return await prisma.$transaction(async (tx) => {
      const lastArtwork = await tx.personArtwork.findFirst({
        where: { personId: owner.person.id },
        orderBy: [{ position: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        select: { position: true },
      });

      return tx.personArtwork.create({
        data: {
          personId: owner.person.id,
          image: blob.url,
          title,
          position: (lastArtwork?.position ?? -1) + 1,
        },
        select: { id: true, image: true, title: true, position: true, createdAt: true },
      });
    });
  } catch (error) {
    await cleanupArtworkBlob(blob.url, owner.person.id);
    throw error;
  }
}

export async function deletePersonArtwork(personId: string, artworkId: string) {
  const owner = await getPersonArtworkOwner(personId);
  const artwork = await prisma.personArtwork.findFirst({
    where: { id: artworkId, personId: owner.person.id },
    select: { id: true, image: true },
  });
  if (!artwork) throw new PersonArtworkError(404, "Artwork not found");

  await prisma.$transaction(async (tx) => {
    await tx.personArtwork.delete({ where: { id: artwork.id } });
    const remaining = await tx.personArtwork.findMany({
      where: { personId: owner.person.id },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    for (const [position, item] of remaining.entries()) {
      await tx.personArtwork.update({ where: { id: item.id }, data: { position } });
    }
  });

  if (isManagedPersonArtworkBlobUrl(artwork.image, owner.person.id)) {
    try {
      await del(artwork.image);
    } catch {
      return { cleanupWarning: true };
    }
  }

  return { cleanupWarning: false };
}

export async function movePersonArtwork(personId: string, artworkId: string, direction: "earlier" | "later") {
  const owner = await getPersonArtworkOwner(personId);
  await prisma.$transaction(async (tx) => {
    const artworks = await tx.personArtwork.findMany({
      where: { personId: owner.person.id },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    const index = artworks.findIndex((artwork) => artwork.id === artworkId);
    if (index === -1) throw new PersonArtworkError(404, "Artwork not found");

    const destination = direction === "earlier" ? index - 1 : index + 1;
    if (destination < 0 || destination >= artworks.length) {
      throw new PersonArtworkError(400, "Artwork is already at that end of the gallery");
    }

    [artworks[index], artworks[destination]] = [artworks[destination], artworks[index]];
    for (const [position, artwork] of artworks.entries()) {
      await tx.personArtwork.update({ where: { id: artwork.id }, data: { position } });
    }
  });
}
