import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authorization";
import { moveUpmanRepresentation } from "@/lib/person-management";

export async function POST(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  const authorization = await requireAdmin();
  if (!authorization.ok) return authorization.response;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.upmanId !== "string" || typeof body.targetPersonId !== "string" || body.confirm !== true) {
    return NextResponse.json({ success: false, error: "Confirm an Upman and destination Person" }, { status: 400 });
  }
  try {
    const result = await moveUpmanRepresentation((await params).personId, body.targetPersonId, body.upmanId, authorization.user);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to move representation" }, { status: 400 });
  }
}
