import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { createActivityLogData } from "@/lib/activity";
import { safelySyncPersonAchievements } from "@/lib/achievements";
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

    const creatorPersonId = updatedUpman.creatorPersonId === undefined
      ? existingUpman.creatorPersonId
      : updatedUpman.creatorPersonId;
    const representedPersonId = updatedUpman.representedPersonId === undefined
      ? existingUpman.representedPersonId
      : updatedUpman.representedPersonId;
    const creatorTwitch = updatedUpman.creatorTwitch === undefined
      ? existingUpman.creatorTwitch
      : updatedUpman.creatorTwitch;
    const dexVisibility = updatedUpman.dexVisibility === undefined
      ? existingUpman.dexVisibility
      : updatedUpman.dexVisibility;
    const isPullable = updatedUpman.isPullable === undefined
      ? existingUpman.isPullable
      : updatedUpman.isPullable;

    if ((updatedUpman.rarity === "Event" || updatedUpman.rarity === "Secret") && isPullable) {
      return NextResponse.json(
        { success: false, error: "Event and Secret Upmans cannot be enabled for classic pulls." },
        { status: 400 }
      );
    }

    const configurationChanged =
      existingUpman.creatorTwitch !== creatorTwitch ||
      existingUpman.dexVisibility !== dexVisibility ||
      existingUpman.isPullable !== isPullable;
    if (configurationChanged && !updatedUpman.confirmConfigurationChange) {
      return NextResponse.json(
        { success: false, error: "Confirm the visibility and availability change before saving." },
        { status: 400 }
      );
    }

    if (
      updatedUpman.rarity === "Common" &&
      existingUpman.representedPersonId &&
      (!updatedUpman.confirmRepresentedPersonRemoval || representedPersonId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Confirm removal of the represented Person before changing this Upman to Common",
        },
        { status: 400 }
      );
    }

    const relationshipIds = [
      creatorPersonId,
      representedPersonId,
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
    const editableFieldsChanged =
      existingUpman.name !== updatedUpman.name ||
      existingUpman.creator !== updatedUpman.creator ||
      existingUpman.rarity !== updatedUpman.rarity ||
      configurationChanged;
    const creatorPersonChanged = existingUpman.creatorPersonId !== creatorPersonId;

    await prisma.$transaction(async (tx) => {
      const upman = await tx.upman.update({
        where: {
          slug: updatedUpman.slug,
        },
        data: {
          name: updatedUpman.name,
          creator: updatedUpman.creator,
          creatorTwitch,
          rarity: updatedUpman.rarity,
          dexVisibility,
          isPullable,
          creatorPersonId,
          representedPersonId,
        },
        select: { id: true, slug: true, name: true },
      });

      if (editableFieldsChanged) {
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
                creatorTwitch: existingUpman.creatorTwitch,
                dexVisibility: existingUpman.dexVisibility,
                isPullable: existingUpman.isPullable,
              },
              after: {
                name: updatedUpman.name,
                creator: updatedUpman.creator,
                rarity: updatedUpman.rarity,
                creatorTwitch,
                dexVisibility,
                isPullable,
              },
            },
          }),
        });
      }

      if (
        existingUpman.creatorPersonId !== creatorPersonId ||
        existingUpman.representedPersonId !== representedPersonId
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
                creatorPerson: creatorPersonId
                  ? peopleById.get(creatorPersonId)?.displayName ?? null
                  : null,
                representedPerson: representedPersonId
                  ? peopleById.get(representedPersonId)?.displayName ?? null
                  : null,
              },
            },
          }),
        });
      }
    });

    if (creatorPersonChanged && creatorPersonId) {
      await safelySyncPersonAchievements(creatorPersonId);
    }

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
