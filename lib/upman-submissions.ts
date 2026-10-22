import "server-only";

import { createHash, randomUUID } from "crypto";
import { del, put } from "@vercel/blob";
import { Prisma, UpmanSubmissionStatus } from "@/app/generated/prisma/client";

import { auth } from "@/auth";
import { createActivityLogData } from "@/lib/activity";
import { isPngFile, UPMAN_IMAGE_MAX_BYTES } from "@/lib/blob";
import { prisma } from "@/lib/prisma";
import { safelySyncLinkedPersonAchievements } from "@/lib/achievements";
import { isUpmanRarity, type UpmanRarity } from "@/lib/upman-rarity";
import { normalizeTwitchLogin } from "@/lib/validation";

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;

export class UpmanSubmissionError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export type SubmissionAuthor = { id: string; twitchLogin: string; displayName: string; avatar: string | null };

function text(value: unknown, maximum: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maximum
    ? value.trim()
    : null;
}

function slugPart(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "upman";
}

async function currentUser(): Promise<SubmissionAuthor> {
  const login = normalizeTwitchLogin((await auth())?.user?.name);
  if (!login) throw new UpmanSubmissionError("Sign in with Twitch to submit an Upman", 401);
  const user = await prisma.user.findUnique({
    where: { twitchLogin: login },
    select: { id: true, twitchLogin: true, displayName: true, avatar: true },
  });
  if (!user) throw new UpmanSubmissionError("Your Twitch account is not ready yet. Please sign in again.", 403);
  return user;
}

export async function getSubmissionAuthor() {
  return currentUser();
}

export async function getMyUpmanSubmissions() {
  const user = await currentUser();
  const submissions = await prisma.upmanSubmission.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, description: true, image: true, status: true, rarity: true, represent: true,
      createdAt: true, reviewedAt: true,
      approvedUpman: { select: { slug: true, name: true } },
    },
  });
  return { user, submissions };
}

export async function createUpmanSubmission(formData: FormData) {
  const user = await currentUser();
  const name = text(formData.get("name"), MAX_NAME_LENGTH);
  const description = text(formData.get("description"), MAX_DESCRIPTION_LENGTH);
  const image = formData.get("image");
  if (!name || !description) throw new UpmanSubmissionError("Provide an Upman name and description");
  if (!(image instanceof File)) throw new UpmanSubmissionError("A PNG image is required");
  if (image.size === 0 || image.size > UPMAN_IMAGE_MAX_BYTES || image.type !== "image/png" || !image.name.toLowerCase().endsWith(".png") || !(await isPngFile(image))) {
    throw new UpmanSubmissionError("Image must be a PNG smaller than 4 MiB");
  }

  const bytes = Buffer.from(await image.arrayBuffer());
  const contentFingerprint = createHash("sha256").update(name.toLocaleLowerCase()).update("\n").update(description).update("\n").update(bytes).digest("hex");
  const duplicate = await prisma.upmanSubmission.findUnique({ where: { userId_contentFingerprint: { userId: user.id, contentFingerprint } }, select: { id: true } });
  if (duplicate) throw new UpmanSubmissionError("This exact proposal was already submitted", 409);

  let blob: { url: string };
  try {
    blob = await put(`upman-submissions/${user.id}/${randomUUID()}.png`, image, { access: "public", addRandomSuffix: false, contentType: "image/png" });
  } catch {
    throw new UpmanSubmissionError("Unable to store the submission image", 500);
  }
  try {
    const submission = await prisma.upmanSubmission.create({
      data: { userId: user.id, name, description, image: blob.url, contentFingerprint },
      select: { id: true, status: true, createdAt: true },
    });
    await safelySyncLinkedPersonAchievements(user.id);
    return submission;
  } catch (error) {
    await del(blob.url).catch(() => undefined);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new UpmanSubmissionError("This exact proposal was already submitted", 409);
    throw error;
  }
}

export async function getAdminUpmanSubmissions(status?: string) {
  const where = status && Object.values(UpmanSubmissionStatus).includes(status as UpmanSubmissionStatus) ? { status: status as UpmanSubmissionStatus } : {};
  return prisma.upmanSubmission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, description: true, image: true, status: true, rarity: true, represent: true,
      createdAt: true, reviewedAt: true,
      user: { select: { id: true, twitchLogin: true, displayName: true, avatar: true, person: { select: { id: true, displayName: true, representedUpmans: { select: { id: true, name: true }, take: 1 } } } } },
      approvedUpman: { select: { id: true, slug: true, name: true, rarity: true } },
    },
  });
}

type ReviewInput = { action: "approve" | "reject"; name?: unknown; description?: unknown; rarity?: unknown; represent?: unknown; confirmReplaceRepresentation?: unknown };

export async function reviewUpmanSubmission(submissionId: string, input: ReviewInput, reviewer: { id: string; twitchLogin: string }) {
  if (!/^[a-z0-9]+$/i.test(submissionId)) throw new UpmanSubmissionError("Invalid submission", 400);
  if (input.action !== "approve" && input.action !== "reject") throw new UpmanSubmissionError("Invalid review action");
  const name = input.name === undefined ? undefined : text(input.name, MAX_NAME_LENGTH);
  const description = input.description === undefined ? undefined : text(input.description, MAX_DESCRIPTION_LENGTH);
  if ((input.name !== undefined && !name) || (input.description !== undefined && !description)) throw new UpmanSubmissionError("Invalid submission details");
  const rarity = input.rarity === undefined ? undefined : (isUpmanRarity(input.rarity) ? input.rarity : null);
  if (input.action === "approve" && !rarity) throw new UpmanSubmissionError("Choose a supported rarity before approving");
  const represent = input.represent === true;

  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; status: UpmanSubmissionStatus; userId: string; name: string; description: string; image: string; approvedUpmanId: string | null }>>`
      SELECT "id", "status", "userId", "name", "description", "image", "approvedUpmanId"
      FROM "UpmanSubmission" WHERE "id" = ${submissionId} FOR UPDATE`;
    const locked = rows[0];
    if (!locked) throw new UpmanSubmissionError("Submission not found", 404);
    if (locked.status === "APPROVED" && locked.approvedUpmanId) {
      const upman = await tx.upman.findUnique({ where: { id: locked.approvedUpmanId }, select: { id: true, slug: true, name: true, rarity: true } });
      return { result: "already-approved" as const, upman, authorUserId: locked.userId };
    }
    if (locked.status !== "PENDING") throw new UpmanSubmissionError("This submission has already been reviewed", 409);
    const nextName = name ?? locked.name;
    const nextDescription = description ?? locked.description;
    if (input.action === "reject") {
      await tx.upmanSubmission.update({ where: { id: locked.id }, data: { name: nextName, description: nextDescription, status: "REJECTED", reviewedByUserId: reviewer.id, reviewedAt: new Date(), represent: false } });
      return { result: "rejected" as const, upman: null, authorUserId: locked.userId };
    }
    const author = await tx.user.findUnique({ where: { id: locked.userId }, select: { id: true, twitchLogin: true, displayName: true, person: { select: { id: true, displayName: true, representedUpmans: { select: { id: true, name: true }, take: 1 } } } } });
    if (!author) throw new UpmanSubmissionError("Submission creator no longer exists", 409);
    if (represent && author.person?.representedUpmans.length && input.confirmReplaceRepresentation !== true) throw new UpmanSubmissionError("Confirm replacement of the current represented Upman", 409);
    const slug = `${slugPart(nextName)}-${locked.id.slice(-6).toLowerCase()}`;
    const upman = await tx.upman.create({
      data: { slug, name: nextName, image: locked.image, rarity: rarity as UpmanRarity, creator: author.displayName, creatorTwitch: author.twitchLogin, creatorPersonId: author.person?.id ?? null, representedPersonId: represent ? author.person?.id ?? null : null, isPullable: rarity !== "Event" && rarity !== "Secret" },
      select: { id: true, slug: true, name: true, rarity: true },
    });
    await tx.upmanSubmission.update({ where: { id: locked.id }, data: { name: nextName, description: nextDescription, status: "APPROVED", rarity, represent, approvedUpmanId: upman.id, reviewedByUserId: reviewer.id, reviewedAt: new Date() } });
    await tx.activityLog.create({ data: createActivityLogData({ action: "UPMAN_CREATED", context: { origin: "ADMIN", actor: reviewer }, target: author, upman }) });
    return { result: "approved" as const, upman, authorUserId: author.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await safelySyncLinkedPersonAchievements(result.authorUserId);
  return result;
}
