import "server-only";

import { auth } from "@/auth";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";

type ProjectOwner = { person: { id: string; displayName: string } };

export class PersonProjectError extends Error {
  constructor(public readonly status: 400 | 401 | 403 | 404, message: string) {
    super(message);
  }
}

async function getPersonProjectOwner(personId: string): Promise<ProjectOwner> {
  const sessionLogin = normalizeTwitchLogin((await auth())?.user?.name);
  if (!sessionLogin) throw new PersonProjectError(401, "Sign in to manage projects");

  const user = await prisma.user.findUnique({
    where: { twitchLogin: sessionLogin },
    select: { id: true },
  });
  if (!user) throw new PersonProjectError(401, "Sign in to manage projects");

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true, displayName: true, userId: true },
  });
  if (!person) throw new PersonProjectError(404, "Person not found");
  if (person.userId !== user.id) throw new PersonProjectError(403, "You can only manage your own projects");

  return { person };
}

async function normalizeProjectPositions(tx: Prisma.TransactionClient, personId: string) {
  const projects = await tx.personProject.findMany({
    where: { personId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  for (const [position, project] of projects.entries()) {
    await tx.personProject.update({ where: { id: project.id }, data: { position } });
  }
  return projects;
}

export async function createPersonProject(personId: string, project: { title: string; description: string }) {
  const owner = await getPersonProjectOwner(personId);
  return prisma.$transaction(async (tx) => {
    const lastProject = await tx.personProject.findFirst({
      where: { personId: owner.person.id },
      orderBy: [{ position: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: { position: true },
    });
    return tx.personProject.create({
      data: { personId: owner.person.id, title: project.title, description: project.description, position: (lastProject?.position ?? -1) + 1 },
      select: { id: true, title: true, description: true, position: true, createdAt: true, updatedAt: true },
    });
  });
}

export async function updatePersonProject(personId: string, projectId: string, project: { title: string; description: string }) {
  const owner = await getPersonProjectOwner(personId);
  const result = await prisma.personProject.updateMany({
    where: { id: projectId, personId: owner.person.id },
    data: project,
  });
  if (result.count !== 1) throw new PersonProjectError(404, "Project not found");
}

export async function deletePersonProject(personId: string, projectId: string) {
  const owner = await getPersonProjectOwner(personId);
  await prisma.$transaction(async (tx) => {
    const result = await tx.personProject.deleteMany({ where: { id: projectId, personId: owner.person.id } });
    if (result.count !== 1) throw new PersonProjectError(404, "Project not found");
    await normalizeProjectPositions(tx, owner.person.id);
  });
}

export async function movePersonProject(personId: string, projectId: string, direction: "earlier" | "later") {
  const owner = await getPersonProjectOwner(personId);
  await prisma.$transaction(async (tx) => {
    const projects = await normalizeProjectPositions(tx, owner.person.id);
    const index = projects.findIndex((project) => project.id === projectId);
    if (index === -1) throw new PersonProjectError(404, "Project not found");
    const destination = direction === "earlier" ? index - 1 : index + 1;
    if (destination < 0 || destination >= projects.length) {
      throw new PersonProjectError(400, "Project is already at that end of your notes");
    }
    [projects[index], projects[destination]] = [projects[destination], projects[index]];
    for (const [position, project] of projects.entries()) {
      await tx.personProject.update({ where: { id: project.id }, data: { position } });
    }
  });
}
