import { Prisma } from "@/app/generated/prisma/client";
import { createActivityLogData } from "@/lib/activity";
import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { validateSlug, validateUpmanRelationshipPayload } from "@/lib/validation";
import { NextResponse } from "next/server";

const MAX_TRANSACTION_ATTEMPTS = 2;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authorization = await requireAdmin();
  if (!authorization.ok) return authorization.response;

  const { slug: rawSlug } = await params;
  const slug = validateSlug(rawSlug);
  if (!slug) return NextResponse.json({ success: false, error: "Invalid Upman" }, { status: 400 });

  let validation;
  try {
    validation = validateUpmanRelationshipPayload(await request.json());
  } catch {
    return NextResponse.json({ success: false, error: "Invalid relationship request" }, { status: 400 });
  }
  if (!validation.success) {
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  }

  const data = validation.data;
  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const upman = await tx.upman.findUnique({
            where: { slug },
            include: {
              creatorPerson: { select: { id: true, displayName: true } },
              representedPerson: { select: { id: true, displayName: true } },
            },
          });
          if (!upman) return { status: "not-found" as const };

          if (data.relation === "represented" && upman.rarity === "Common" && data.source !== "unlink") {
            return { status: "common" as const };
          }

          let person: { id: string; displayName: string } | null = null;
          let personCreated = false;
          let linkedUserLogin: string | null | undefined;

          if (data.source === "existing-person") {
            person = await tx.person.findUnique({
              where: { id: data.personId },
              select: { id: true, displayName: true },
            });
            if (!person) return { status: "person-not-found" as const };
          }

          if (data.source === "create-person") {
            if (data.userId) {
              const user = await tx.user.findUnique({
                where: { id: data.userId },
                select: { id: true, twitchLogin: true },
              });
              if (!user) return { status: "user-not-found" as const };
              linkedUserLogin = user.twitchLogin;
              person = await tx.person.findUnique({
                where: { userId: user.id },
                select: { id: true, displayName: true },
              });
              if (!person) {
                person = await tx.person.create({
                  data: { displayName: data.displayName, userId: user.id, isPublic: true },
                  select: { id: true, displayName: true },
                });
                personCreated = true;
              }
            } else {
              person = await tx.person.create({
                data: { displayName: data.displayName, isPublic: true },
                select: { id: true, displayName: true },
              });
              personCreated = true;
            }
          }

          const previous = data.relation === "creator" ? upman.creatorPerson : upman.representedPerson;
          const nextPersonId = person?.id ?? null;
          if (previous?.id !== nextPersonId) {
            const updated = await tx.upman.update({
              where: { id: upman.id },
              data: data.relation === "creator"
                ? { creatorPersonId: nextPersonId }
                : { representedPersonId: nextPersonId },
              select: { id: true, slug: true, name: true },
            });

            if (personCreated && person) {
              await tx.activityLog.create({
                data: createActivityLogData({
                  action: "PERSON_CREATED",
                  context: { origin: "ADMIN", actor: authorization.user },
                  person,
                  metadata: { changes: ["created through Upman relationship linking"], linkedUserLogin },
                }),
              });
            }

            await tx.activityLog.create({
              data: createActivityLogData({
                action: "UPMAN_RELATIONSHIPS_UPDATED",
                context: { origin: "ADMIN", actor: authorization.user },
                upman: updated,
                metadata: {
                  before: {
                    creatorPerson: data.relation === "creator" ? previous?.displayName ?? null : upman.creatorPerson?.displayName ?? null,
                    representedPerson: data.relation === "represented" ? previous?.displayName ?? null : upman.representedPerson?.displayName ?? null,
                  },
                  after: {
                    creatorPerson: data.relation === "creator" ? person?.displayName ?? null : upman.creatorPerson?.displayName ?? null,
                    representedPerson: data.relation === "represented" ? person?.displayName ?? null : upman.representedPerson?.displayName ?? null,
                  },
                },
              }),
            });
          }

          return { status: "success" as const, person, personCreated };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      if (result.status === "not-found") return NextResponse.json({ success: false, error: "Upman not found" }, { status: 404 });
      if (result.status === "person-not-found") return NextResponse.json({ success: false, error: "Selected Person not found" }, { status: 400 });
      if (result.status === "user-not-found") return NextResponse.json({ success: false, error: "Selected User not found" }, { status: 400 });
      if (result.status === "common") return NextResponse.json({ success: false, error: "Common Upmans cannot represent a Person" }, { status: 400 });
      return NextResponse.json({ success: true, person: result.person, personCreated: result.personCreated });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2002");
      if (retryable && attempt + 1 < MAX_TRANSACTION_ATTEMPTS) continue;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ success: false, error: "This User was linked to a Person concurrently. Please retry." }, { status: 409 });
      }
      return NextResponse.json({ success: false, error: "Unable to update the Upman relationship" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, error: "Unable to update the Upman relationship" }, { status: 500 });
}
