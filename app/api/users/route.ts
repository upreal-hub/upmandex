import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return authorization.response;
  }

  const users =
    await prisma.user.findMany({
      orderBy: {
        displayName: "asc",
      },

      select: {
        twitchLogin: true,
        displayName: true,
      },
    });

  return NextResponse.json(
    users
  );
}
