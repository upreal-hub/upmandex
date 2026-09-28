import { NextResponse } from "next/server";

import { PersonArtworkError, uploadPersonArtwork } from "@/lib/person-art";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) {
      return NextResponse.json({ success: false, error: "Choose an artwork image" }, { status: 400 });
    }

    const artwork = await uploadPersonArtwork((await params).id, image, formData.get("title"));
    return NextResponse.json({ success: true, artwork }, { status: 201 });
  } catch (error) {
    if (error instanceof PersonArtworkError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, error: "Unable to upload artwork" }, { status: 500 });
  }
}
