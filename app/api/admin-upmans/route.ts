import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const upmans = await prisma.upman.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(upmans);
}