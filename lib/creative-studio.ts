import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";

export type CreativePublicationKind = "art" | "project";

export class CreativeStudioError extends Error {
  constructor(public readonly status: 400 | 401 | 403 | 404 | 503, message: string) {
    super(message);
  }
}

/**
 * Allows the Studio shell to deploy safely before its additive migration has
 * been run. It is deliberately a narrow schema metadata check, not a catch-all
 * Prisma error fallback.
 */
export async function isCreativeStudioSchemaAvailable() {
  const rows = await prisma.$queryRaw<Array<{ available: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'PersonArtwork'
        AND column_name = 'allowDownloads'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = 'PersonArtworkLike'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = 'PersonProjectLike'
    ) AS "available"
  `;
  return rows[0]?.available === true;
}

export function parseCreativePublicationKind(value: string): CreativePublicationKind | null {
  return value === "art" || value === "project" ? value : null;
}

async function currentUserId() {
  const login = normalizeTwitchLogin((await auth())?.user?.name);
  if (!login) throw new CreativeStudioError(401, "Sign in with Twitch to like creations");
  const user = await prisma.user.findUnique({ where: { twitchLogin: login }, select: { id: true } });
  if (!user) throw new CreativeStudioError(401, "Your Twitch account is not available");
  return user.id;
}

async function ensurePublicPublication(kind: CreativePublicationKind, id: string) {
  const publication = kind === "art"
    ? await prisma.personArtwork.findUnique({ where: { id }, select: { id: true, person: { select: { isPublic: true } } } })
    : await prisma.personProject.findUnique({ where: { id }, select: { id: true, person: { select: { isPublic: true } } } });
  if (!publication || !publication.person.isPublic) throw new CreativeStudioError(404, "Publication not found");
}

export async function toggleCreativeLike(kind: CreativePublicationKind, id: string) {
  if (!await isCreativeStudioSchemaAvailable()) {
    throw new CreativeStudioError(503, "Likes will be available after the Creative Studio migration is applied");
  }
  const userId = await currentUserId();
  await ensurePublicPublication(kind, id);

  return prisma.$transaction(async (tx) => {
    if (kind === "art") {
      const existing = await tx.personArtworkLike.findUnique({ where: { userId_artworkId: { userId, artworkId: id } } });
      if (existing) {
        await tx.personArtworkLike.delete({ where: { userId_artworkId: { userId, artworkId: id } } });
        return { liked: false, likes: await tx.personArtworkLike.count({ where: { artworkId: id } }) };
      }
      await tx.personArtworkLike.create({ data: { userId, artworkId: id } });
      return { liked: true, likes: await tx.personArtworkLike.count({ where: { artworkId: id } }) };
    }

    const existing = await tx.personProjectLike.findUnique({ where: { userId_projectId: { userId, projectId: id } } });
    if (existing) {
      await tx.personProjectLike.delete({ where: { userId_projectId: { userId, projectId: id } } });
      return { liked: false, likes: await tx.personProjectLike.count({ where: { projectId: id } }) };
    }
    await tx.personProjectLike.create({ data: { userId, projectId: id } });
    return { liked: true, likes: await tx.personProjectLike.count({ where: { projectId: id } }) };
  });
}

export async function updateArtworkStudioSettings(id: string, input: { title: string | null; allowDownloads: boolean }) {
  if (!await isCreativeStudioSchemaAvailable()) {
    throw new CreativeStudioError(503, "Creative Studio settings will be available after the migration is applied");
  }
  const userId = await currentUserId();
  const artwork = await prisma.personArtwork.findUnique({ where: { id }, select: { person: { select: { userId: true } } } });
  if (!artwork) throw new CreativeStudioError(404, "Artwork not found");
  if (artwork.person.userId !== userId) throw new CreativeStudioError(403, "You can only edit your own artwork");
  return prisma.personArtwork.update({ where: { id }, data: input, select: { id: true, title: true, allowDownloads: true } });
}

export async function updateProjectStudioSettings(id: string, input: { title: string; description: string }) {
  const userId = await currentUserId();
  const project = await prisma.personProject.findUnique({ where: { id }, select: { person: { select: { userId: true } } } });
  if (!project) throw new CreativeStudioError(404, "Project not found");
  if (project.person.userId !== userId) throw new CreativeStudioError(403, "You can only edit your own project");
  return prisma.personProject.update({ where: { id }, data: input, select: { id: true, title: true, description: true } });
}
