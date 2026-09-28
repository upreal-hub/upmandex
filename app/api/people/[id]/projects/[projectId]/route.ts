import { NextResponse } from "next/server";

import { deletePersonProject, movePersonProject, PersonProjectError, updatePersonProject } from "@/lib/person-projects";
import { validatePersonProjectMutationPayload } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; projectId: string }> }) {
  const validation = validatePersonProjectMutationPayload(await request.json().catch(() => null));
  if (!validation.success) return NextResponse.json({ success: false, error: validation.error }, { status: 400 });

  try {
    const { id, projectId } = await params;
    if (validation.data.type === "move") {
      await movePersonProject(id, projectId, validation.data.direction);
    } else {
      await updatePersonProject(id, projectId, {
        title: validation.data.title,
        description: validation.data.description,
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PersonProjectError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, error: "Unable to update project" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; projectId: string }> }) {
  try {
    const { id, projectId } = await params;
    await deletePersonProject(id, projectId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PersonProjectError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, error: "Unable to delete project" }, { status: 500 });
  }
}
