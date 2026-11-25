import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSitePrivate } from "@/lib/site-publication";
import { isPrivateSiteMember } from "@/lib/private-site-access";
import { submissionMediaResponse } from "@/lib/submission-media-response";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return submissionMediaResponse(id, {
  load: async () => {
  const twitchUserId = (await auth())?.user?.twitchUserId;
  const [submission, user, privateSite] = await Promise.all([
    prisma.upmanSubmission.findUnique({ where: { id }, select: {
      image: true, userId: true, status: true,
      approvedUpman: { select: { dexVisibility: true, rarity: true,
        inventory: { where: twitchUserId ? { user: { twitchUserId } } : { userId: "" }, select: { userId: true }, take: 1 },
      } },
    } }),
    twitchUserId ? prisma.user.findUnique({ where: { twitchUserId }, select: { id: true, role: true } }) : null,
    isSitePrivate(),
  ]);
  if (!submission) return null;
  return { image: submission.image, access: { admin: user?.role === "ADMIN",
    owner: user?.id === submission.userId || Boolean(submission.approvedUpman?.inventory.length),
    privateSite, member: isPrivateSiteMember(twitchUserId),
    approvedPublic: submission.status === "APPROVED" && submission.approvedUpman?.dexVisibility === "PUBLIC"
      && submission.approvedUpman.rarity !== "Secret" } };
  },
  readPrivate: async url => {
    if (!process.env.PRIVATE_BLOB_READ_WRITE_TOKEN) return null;
    const blob = await get(url, { access: "private", useCache: false, token: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN });
    return blob?.statusCode === 200 ? { stream: blob.stream } : null;
  },
  readLegacyPublic: url => fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) }),
  });
}
