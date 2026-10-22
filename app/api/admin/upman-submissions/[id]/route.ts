import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authorization";
import { reviewUpmanSubmission, UpmanSubmissionError } from "@/lib/upman-submissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireAdmin();
  if (!authorization.ok) return authorization.response;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ success: false, error: "Invalid review payload" }, { status: 400 });
  try {
    return NextResponse.json({ success: true, ...(await reviewUpmanSubmission((await params).id, body as never, authorization.user)) });
  } catch (error) {
    if (error instanceof UpmanSubmissionError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    console.error("Upman submission review failed.");
    return NextResponse.json({ success: false, error: "Unable to review the submission" }, { status: 500 });
  }
}
