import { auth } from "@/auth";
import CreativeStudio from "./CreativeStudio";
import { isCreativeStudioSchemaAvailable } from "@/lib/creative-studio";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StudioPerson = {
  id: string;
  displayName: string;
  userId: string | null;
  user: { twitchLogin: string | null } | null;
};

type StudioArtwork = {
  id: string;
  image: string;
  title: string | null;
  createdAt: Date;
  allowDownloads: boolean;
  likes: number;
  liked: boolean;
  person: StudioPerson;
};

type StudioProject = {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  liked: boolean;
  person: StudioPerson;
};

export default async function CreativeStudioPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab === "projects" ? "projects" : "art";
  const login = normalizeTwitchLogin((await auth())?.user?.name);
  const viewer = login
    ? await prisma.user.findUnique({ where: { twitchLogin: login }, select: { id: true } })
    : null;
  const migrationReady = await isCreativeStudioSchemaAvailable();

  let artworks: StudioArtwork[];
  let projects: StudioProject[];

  if (migrationReady) {
    const [artworkRecords, projectRecords] = await Promise.all([
      prisma.personArtwork.findMany({
        where: { person: { is: { isPublic: true } } },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        select: {
          id: true,
          image: true,
          title: true,
          createdAt: true,
          allowDownloads: true,
          _count: { select: { likes: true } },
          likes: viewer ? { where: { userId: viewer.id }, select: { userId: true } } : false,
          person: { select: { id: true, displayName: true, userId: true, user: { select: { twitchLogin: true } } } },
        },
      }),
      prisma.personProject.findMany({
        where: { person: { is: { isPublic: true } } },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { likes: true } },
          likes: viewer ? { where: { userId: viewer.id }, select: { userId: true } } : false,
          person: { select: { id: true, displayName: true, userId: true, user: { select: { twitchLogin: true } } } },
        },
      }),
    ]);

    artworks = artworkRecords.map((artwork) => ({
      id: artwork.id,
      image: artwork.image,
      title: artwork.title,
      createdAt: artwork.createdAt,
      allowDownloads: artwork.allowDownloads,
      likes: artwork._count.likes,
      liked: viewer ? artwork.likes.length > 0 : false,
      person: artwork.person,
    }));
    projects = projectRecords.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      likes: project._count.likes,
      liked: viewer ? project.likes.length > 0 : false,
      person: project.person,
    }));
  } else {
    const [artworkRecords, projectRecords] = await Promise.all([
      prisma.personArtwork.findMany({
        where: { person: { is: { isPublic: true } } },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        select: {
          id: true,
          image: true,
          title: true,
          createdAt: true,
          person: { select: { id: true, displayName: true, userId: true, user: { select: { twitchLogin: true } } } },
        },
      }),
      prisma.personProject.findMany({
        where: { person: { is: { isPublic: true } } },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          person: { select: { id: true, displayName: true, userId: true, user: { select: { twitchLogin: true } } } },
        },
      }),
    ]);

    artworks = artworkRecords.map((artwork) => ({ ...artwork, allowDownloads: false, likes: 0, liked: false }));
    projects = projectRecords.map((project) => ({ ...project, likes: 0, liked: false }));
  }

  return (
    <CreativeStudio
      initialTab={tab}
      migrationReady={migrationReady}
      signedIn={Boolean(viewer)}
      artworks={artworks.map((artwork) => ({
        id: artwork.id,
        image: artwork.image,
        title: artwork.title,
        createdAt: artwork.createdAt.toISOString(),
        allowDownloads: artwork.allowDownloads,
        likes: artwork.likes,
        liked: artwork.liked,
        owner: artwork.person.userId === viewer?.id,
        person: { id: artwork.person.id, displayName: artwork.person.displayName, twitchLogin: artwork.person.user?.twitchLogin ?? null },
      }))}
      projects={projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        likes: project.likes,
        liked: project.liked,
        owner: project.person.userId === viewer?.id,
        person: { id: project.person.id, displayName: project.person.displayName, twitchLogin: project.person.user?.twitchLogin ?? null },
      }))}
    />
  );
}
