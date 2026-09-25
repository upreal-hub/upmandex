import { Prisma } from "@/app/generated/prisma/client";
import { createActivityLogData } from "@/lib/activity";
import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { validatePersonPayload } from "@/lib/validation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.ok) return authorization.response;

  try {
    const validation = validatePersonPayload(await request.json());
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const data = validation.data;
    let linkedUserLogin: string | null | undefined;
    if (data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true, twitchLogin: true },
      });
      if (!user) return NextResponse.json({ success: false, error: "Selected User not found" }, { status: 400 });
      linkedUserLogin = user.twitchLogin;
    }

    const person = await prisma.$transaction(async (tx) => {
      const created = await tx.person.create({
        data,
        select: { id: true, displayName: true },
      });
      await tx.activityLog.create({
        data: createActivityLogData({
          action: "PERSON_CREATED",
          context: { origin: "ADMIN", actor: authorization.user },
          person: created,
          metadata: { changes: ["created"], linkedUserLogin },
        }),
      });
      return created;
    });

    return NextResponse.json({ success: true, person }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ success: false, error: "This User is already linked to another Person" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: "Unable to create Person" }, { status: 500 });
  }
}
