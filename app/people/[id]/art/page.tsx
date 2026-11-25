import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import PersonArtworkGallery from "../PersonArtworkGallery";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PersonArtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await prisma.person.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      displayName: true,
      isPublic: true,
      artworks: { orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }], select: { id: true, image: true, title: true } },
    },
  });
  if (!person) notFound();

  const twitchUserId = (await auth())?.user?.twitchUserId;
  const currentUser = twitchUserId ? await prisma.user.findUnique({ where: { twitchUserId }, select: { id: true } }) : null;
  const isOwner = Boolean(currentUser && person.userId === currentUser.id);
  if (!person.isPublic && !isOwner) notFound();

  return <PersonArtworkGallery personId={person.id} personName={person.displayName} artworks={person.artworks} isOwner={isOwner} />;
}
