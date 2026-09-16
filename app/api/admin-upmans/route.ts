import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return authorization.response;
  }

  const upmans = await prisma.upman.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(upmans);
}
