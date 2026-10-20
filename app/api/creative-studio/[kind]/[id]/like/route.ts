import { NextResponse } from "next/server";

import { CreativeStudioError, parseCreativePublicationKind, toggleCreativeLike } from "@/lib/creative-studio";

export async function POST(_: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind: rawKind, id } = await params;
  const kind = parseCreativePublicationKind(rawKind);
  if (!kind) return NextResponse.json({ success: false, error: "Unknown publication type" }, { status: 400 });

  try {
    return NextResponse.json({ success: true, ...(await toggleCreativeLike(kind, id)) });
  } catch (error) {
    if (error instanceof CreativeStudioError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    return NextResponse.json({ success: false, error: "Unable to update like" }, { status: 500 });
  }
}
