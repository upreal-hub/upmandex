import { NextResponse } from "next/server";

import { deletePersonArtwork, movePersonArtwork, PersonArtworkError } from "@/lib/person-art";
import { validateArtworkMovePayload } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; artworkId: string }> }) {
  const validation = validateArtworkMovePayload(await request.json().catch(() => null));
  if (!validation.success) return NextResponse.json({ success: false, error: validation.error }, { status: 400 });

  try {
    const { id, artworkId } = await params;
    await movePersonArtwork(id, artworkId, validation.direction);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PersonArtworkError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, error: "Unable to reorder artwork" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; artworkId: string }> }) {
  try {
    const { id, artworkId } = await params;
    const result = await deletePersonArtwork(id, artworkId);
    return NextResponse.json({ success: true, warning: result.cleanupWarning ? "Artwork deleted, but image cleanup could not be completed." : undefined });
  } catch (error) {
    if (error instanceof PersonArtworkError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, error: "Unable to delete artwork" }, { status: 500 });
  }
}
