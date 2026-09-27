import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authorization";
import { syncPersonAchievements } from "@/lib/achievements";

export async function POST(_request: Request, { params }: { params: Promise<{ personId: string }> }) {
  const authorization = await requireAdmin();
  if (!authorization.ok) return authorization.response;

  const { personId } = await params;
  const progress = await syncPersonAchievements(personId);
  if (!progress) {
    return NextResponse.json({ success: false, error: "Person not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, progress: progress.summary });
}
