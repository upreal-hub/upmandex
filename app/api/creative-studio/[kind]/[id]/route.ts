import { NextResponse } from "next/server";

import { CreativeStudioError, parseCreativePublicationKind, updateArtworkStudioSettings, updateProjectStudioSettings } from "@/lib/creative-studio";

function validText(value: unknown, min: number, max: number) {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind: rawKind, id } = await params;
  const kind = parseCreativePublicationKind(rawKind);
  if (!kind) return NextResponse.json({ success: false, error: "Unknown publication type" }, { status: 400 });
  const body = await request.json().catch(() => null);

  try {
    if (kind === "art") {
      const title = body?.title;
      if (!(title === null || typeof title === "string") || (typeof title === "string" && title.trim().length > 120) || typeof body?.allowDownloads !== "boolean") {
        return NextResponse.json({ success: false, error: "Invalid artwork settings" }, { status: 400 });
      }
      return NextResponse.json({ success: true, publication: await updateArtworkStudioSettings(id, { title: typeof title === "string" && title.trim() ? title.trim() : null, allowDownloads: body.allowDownloads }) });
    }

    if (!validText(body?.title, 1, 120) || !validText(body?.description, 1, 1000)) {
      return NextResponse.json({ success: false, error: "Invalid project settings" }, { status: 400 });
    }
    return NextResponse.json({ success: true, publication: await updateProjectStudioSettings(id, { title: body.title.trim(), description: body.description.trim() }) });
  } catch (error) {
    if (error instanceof CreativeStudioError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    return NextResponse.json({ success: false, error: "Unable to update publication" }, { status: 500 });
  }
}
