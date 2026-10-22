import { NextResponse } from "next/server";

import { UpmanSubmissionError, createUpmanSubmission, getMyUpmanSubmissions } from "@/lib/upman-submissions";

export const runtime = "nodejs";

function failure(error: unknown) {
  if (error instanceof UpmanSubmissionError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  console.error("Upman submission request failed.");
  return NextResponse.json({ success: false, error: "Unable to process the submission" }, { status: 500 });
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, ...(await getMyUpmanSubmissions()) });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json({ success: true, submission: await createUpmanSubmission(await request.formData()) }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
