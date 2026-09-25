import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { createActivityLogData } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { validateUpmanUpdatePayload } from "@/lib/validation";

export async function POST(req: Request) {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return authorization.response;
  }

  try {
    const validation = validateUpmanUpdatePayload(await req.json());
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const updatedUpman = validation.data;

    const existingUpman =
      await prisma.upman.findUnique({
        where: {
          slug: updatedUpman.slug,
        },
      });

    if (!existingUpman) {
      return NextResponse.json(
        {
          success: false,
          error: "Upman not found",
        },
        { status: 404 }
      );
    }

    const relationshipIds = [
      updatedUpman.creatorPersonId,
      updatedUpman.representedPersonId,
    ].filter((id): id is string => Boolean(id));
    const people = relationshipIds.length
      ? await prisma.person.findMany({
          where: { id: { in: relationshipIds } },
          select: { id: true, displayName: true },
        })
      : [];

    if (people.length !== new Set(relationshipIds).size) {
      return NextResponse.json(
        { success: false, error: "Selected Person not found" },
        { status: 400 }
      );
    }

    const peopleById = new Map(people.map((person) => [person.id, person]));
    const legacyFieldsChanged =
      existingUpman.name !== updatedUpman.name ||
      existingUpman.creator !== updatedUpman.creator ||
      existingUpman.rarity !== updatedUpman.rarity;

    await prisma.$transaction(async (tx) => {
      const upman = await tx.upman.update({
        where: {
          slug: updatedUpman.slug,
        },
        data: {
          name: updatedUpman.name,
          creator: updatedUpman.creator,
          rarity: updatedUpman.rarity,
          creatorPersonId: updatedUpman.creatorPersonId,
          representedPersonId: updatedUpman.representedPersonId,
        },
        select: { id: true, slug: true, name: true },
      });

      if (legacyFieldsChanged) {
        await tx.activityLog.create({
          data: createActivityLogData({
            action: "UPMAN_UPDATED",
            context: { origin: "ADMIN", actor: authorization.user },
            upman,
            metadata: {
              before: {
                name: existingUpman.name,
                creator: existingUpman.creator,
                rarity: existingUpman.rarity,
              },
              after: {
                name: updatedUpman.name,
                creator: updatedUpman.creator,
                rarity: updatedUpman.rarity,
              },
            },
          }),
        });
      }

      if (
        existingUpman.creatorPersonId !== updatedUpman.creatorPersonId ||
        existingUpman.representedPersonId !== updatedUpman.representedPersonId
      ) {
        const previousIds = [
          existingUpman.creatorPersonId,
          existingUpman.representedPersonId,
        ].filter((id): id is string => Boolean(id));
        const previousPeople = previousIds.length
          ? await tx.person.findMany({
              where: { id: { in: previousIds } },
              select: { id: true, displayName: true },
            })
          : [];
        const previousPeopleById = new Map(previousPeople.map((person) => [person.id, person]));

        await tx.activityLog.create({
          data: createActivityLogData({
            action: "UPMAN_RELATIONSHIPS_UPDATED",
            context: { origin: "ADMIN", actor: authorization.user },
            upman,
            metadata: {
              before: {
                creatorPerson: existingUpman.creatorPersonId
                  ? previousPeopleById.get(existingUpman.creatorPersonId)?.displayName ?? null
                  : null,
                representedPerson: existingUpman.representedPersonId
                  ? previousPeopleById.get(existingUpman.representedPersonId)?.displayName ?? null
                  : null,
              },
              after: {
                creatorPerson: updatedUpman.creatorPersonId
                  ? peopleById.get(updatedUpman.creatorPersonId)?.displayName ?? null
                  : null,
                representedPerson: updatedUpman.representedPersonId
                  ? peopleById.get(updatedUpman.representedPersonId)?.displayName ?? null
                  : null,
              },
            },
          }),
        });
      }
    });

    return NextResponse.json({
      success: true,
    });

  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to update Upman",
      },
      { status: 500 }
    );
  }
}
