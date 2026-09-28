import "server-only";

import { isIP } from "node:net";

import type { Prisma } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import { PERSON_LINK_PLATFORMS, type PersonLinkPlatform } from "@/lib/person-link-platforms";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";

const MAX_PERSON_LINK_URL_LENGTH = 2048;

const PLATFORM_HOSTS: Partial<Record<PersonLinkPlatform, ReadonlySet<string>>> = {
  YOUTUBE: new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]),
  INSTAGRAM: new Set(["instagram.com", "www.instagram.com"]),
  TIKTOK: new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com"]),
  BLUESKY: new Set(["bsky.app"]),
  X: new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]),
  GITHUB: new Set(["github.com", "www.github.com"]),
};

type PersonLinkInput = { platform: PersonLinkPlatform; url: string };

export class PersonLinkError extends Error {
  constructor(public readonly status: 400 | 401 | 403 | 404 | 409, message: string) {
    super(message);
  }
}

function isPersonLinkPlatform(value: unknown): value is PersonLinkPlatform {
  return typeof value === "string" && (PERSON_LINK_PLATFORMS as readonly string[]).includes(value);
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
}

function isPrivateIpv4(hostname: string) {
  const values = hostname.split(".").map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  const [first, second] = values;
  return first === 0 || first === 10 || first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168);
}

function isPrivateIpv6(hostname: string) {
  const value = hostname.toLowerCase();
  return value === "::" || value === "::1" || value.startsWith("::ffff:") || /^f[cd][0-9a-f:]*$/.test(value) || /^fe[89ab][0-9a-f:]*$/.test(value);
}

function isPublicHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  if (!normalized || normalized === "localhost" || normalized.endsWith(".localhost")) return false;
  const family = isIP(normalized);
  if (family === 4) return !isPrivateIpv4(normalized);
  if (family === 6) return !isPrivateIpv6(normalized);
  return true;
}

export function validatePersonLinkInput(value: unknown): PersonLinkInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PersonLinkError(400, "Invalid link details");
  }
  const payload = value as Record<string, unknown>;
  if (Object.keys(payload).some((key) => key !== "platform" && key !== "url")) {
    throw new PersonLinkError(400, "Invalid link details");
  }
  if (!isPersonLinkPlatform(payload.platform) || typeof payload.url !== "string") {
    throw new PersonLinkError(400, "Choose a platform and a valid URL");
  }

  const urlValue = payload.url.trim();
  if (!urlValue || urlValue.length > MAX_PERSON_LINK_URL_LENGTH) {
    throw new PersonLinkError(400, "Link URLs must be between 1 and 2048 characters");
  }

  let parsed: URL;
  try {
    parsed = new URL(urlValue);
  } catch {
    throw new PersonLinkError(400, "Enter a valid absolute HTTPS URL");
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || !isPublicHostname(hostname)) {
    throw new PersonLinkError(400, "Enter a public HTTPS URL without credentials");
  }

  const allowedHosts = PLATFORM_HOSTS[payload.platform];
  if (allowedHosts && !allowedHosts.has(hostname)) {
    throw new PersonLinkError(400, `Enter a valid ${payload.platform === "X" ? "X" : payload.platform.toLowerCase()} URL`);
  }

  return { platform: payload.platform, url: urlValue };
}

export function validatePersonLinkMutation(value: unknown):
  | { type: "update"; link: PersonLinkInput }
  | { type: "move"; direction: "earlier" | "later" } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PersonLinkError(400, "Invalid link request");
  }
  const payload = value as Record<string, unknown>;
  if (payload.action === "move") {
    if (Object.keys(payload).some((key) => key !== "action" && key !== "direction")) {
      throw new PersonLinkError(400, "Invalid link request");
    }
    if (payload.direction !== "earlier" && payload.direction !== "later") {
      throw new PersonLinkError(400, "Invalid link move");
    }
    return { type: "move", direction: payload.direction };
  }
  return { type: "update", link: validatePersonLinkInput(value) };
}

async function getPersonLinkOwner(personId: string) {
  const sessionLogin = normalizeTwitchLogin((await auth())?.user?.name);
  if (!sessionLogin) throw new PersonLinkError(401, "Sign in to manage links");
  const user = await prisma.user.findUnique({ where: { twitchLogin: sessionLogin }, select: { id: true } });
  if (!user) throw new PersonLinkError(401, "Sign in to manage links");
  const person = await prisma.person.findUnique({ where: { id: personId }, select: { id: true, userId: true } });
  if (!person) throw new PersonLinkError(404, "Person not found");
  if (person.userId !== user.id) throw new PersonLinkError(403, "You can only manage your own links");
  return person;
}

async function normalizeLinkPositions(tx: Prisma.TransactionClient, personId: string) {
  const links = await tx.personLink.findMany({
    where: { personId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  for (const [position, link] of links.entries()) {
    await tx.personLink.update({ where: { id: link.id }, data: { position } });
  }
  return links;
}

function isUniquePlatformError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

export async function createPersonLink(personId: string, payload: unknown) {
  const link = validatePersonLinkInput(payload);
  const person = await getPersonLinkOwner(personId);
  try {
    return await prisma.$transaction(async (tx) => {
      const duplicate = await tx.personLink.findUnique({ where: { personId_platform: { personId: person.id, platform: link.platform } }, select: { id: true } });
      if (duplicate) throw new PersonLinkError(409, "This platform is already on your profile");
      const last = await tx.personLink.findFirst({ where: { personId: person.id }, orderBy: [{ position: "desc" }, { createdAt: "desc" }, { id: "desc" }], select: { position: true } });
      return tx.personLink.create({ data: { personId: person.id, ...link, position: (last?.position ?? -1) + 1 }, select: { id: true, platform: true, url: true, position: true, createdAt: true, updatedAt: true } });
    });
  } catch (error) {
    if (isUniquePlatformError(error)) throw new PersonLinkError(409, "This platform is already on your profile");
    throw error;
  }
}

export async function updatePersonLink(personId: string, linkId: string, payload: unknown) {
  const link = validatePersonLinkInput(payload);
  const person = await getPersonLinkOwner(personId);
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.personLink.findFirst({ where: { id: linkId, personId: person.id }, select: { id: true } });
      if (!existing) throw new PersonLinkError(404, "Link not found");
      const duplicate = await tx.personLink.findFirst({ where: { personId: person.id, platform: link.platform, id: { not: linkId } }, select: { id: true } });
      if (duplicate) throw new PersonLinkError(409, "This platform is already on your profile");
      await tx.personLink.update({ where: { id: linkId }, data: link });
    });
  } catch (error) {
    if (isUniquePlatformError(error)) throw new PersonLinkError(409, "This platform is already on your profile");
    throw error;
  }
}

export async function deletePersonLink(personId: string, linkId: string) {
  const person = await getPersonLinkOwner(personId);
  await prisma.$transaction(async (tx) => {
    const result = await tx.personLink.deleteMany({ where: { id: linkId, personId: person.id } });
    if (result.count !== 1) throw new PersonLinkError(404, "Link not found");
    await normalizeLinkPositions(tx, person.id);
  });
}

export async function movePersonLink(personId: string, linkId: string, direction: "earlier" | "later") {
  const person = await getPersonLinkOwner(personId);
  await prisma.$transaction(async (tx) => {
    const links = await normalizeLinkPositions(tx, person.id);
    const index = links.findIndex((link) => link.id === linkId);
    if (index === -1) throw new PersonLinkError(404, "Link not found");
    const destination = direction === "earlier" ? index - 1 : index + 1;
    if (destination < 0 || destination >= links.length) throw new PersonLinkError(400, "Link is already at that end of your profile");
    [links[index], links[destination]] = [links[destination], links[index]];
    for (const [position, link] of links.entries()) {
      await tx.personLink.update({ where: { id: link.id }, data: { position } });
    }
  });
}
