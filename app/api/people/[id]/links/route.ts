import { NextResponse } from "next/server";

import { createPersonLink, PersonLinkError } from "@/lib/person-links";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const link = await createPersonLink((await params).id, await request.json().catch(() => null));
    return NextResponse.json({ success: true, link }, { status: 201 });
  } catch (error) {
    if (error instanceof PersonLinkError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    return NextResponse.json({ success: false, error: "Unable to add link" }, { status: 500 });
  }
}
