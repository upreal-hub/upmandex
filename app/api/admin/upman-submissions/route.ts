import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authorization";
import { getAdminUpmanSubmissions } from "@/lib/upman-submissions";

export async function GET(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.ok) return authorization.response;
  const status = new URL(request.url).searchParams.get("status") ?? undefined;
  return NextResponse.json({ success: true, submissions: await getAdminUpmanSubmissions(status) });
}
