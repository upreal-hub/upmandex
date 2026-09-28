import { NextResponse } from "next/server";

import { createPersonProject, PersonProjectError } from "@/lib/person-projects";
import { validatePersonProjectPayload } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const validation = validatePersonProjectPayload(await request.json().catch(() => null));
  if (!validation.success) return NextResponse.json({ success: false, error: validation.error }, { status: 400 });

  try {
    const project = await createPersonProject((await params).id, validation.data);
    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (error) {
    if (error instanceof PersonProjectError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, error: "Unable to add project" }, { status: 500 });
  }
}
