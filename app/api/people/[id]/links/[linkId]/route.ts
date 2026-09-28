import { NextResponse } from "next/server";

import { deletePersonLink, movePersonLink, PersonLinkError, updatePersonLink, validatePersonLinkMutation } from "@/lib/person-links";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  try {
    const mutation = validatePersonLinkMutation(await request.json().catch(() => null));
    const { id, linkId } = await params;
    if (mutation.type === "move") await movePersonLink(id, linkId, mutation.direction);
    else await updatePersonLink(id, linkId, mutation.link);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PersonLinkError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    return NextResponse.json({ success: false, error: "Unable to update link" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  try {
    const { id, linkId } = await params;
    await deletePersonLink(id, linkId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PersonLinkError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    return NextResponse.json({ success: false, error: "Unable to delete link" }, { status: 500 });
  }
}
