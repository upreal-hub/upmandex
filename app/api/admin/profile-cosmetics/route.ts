import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authorization";
import { createProfileCosmetic, parseProfileCosmeticType, ProfileCosmeticError, validateProfileCosmeticName } from "@/lib/profile-cosmetics";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const form = await request.formData();
    if ([...form.keys()].some((key) => key !== "type" && key !== "name" && key !== "image")) throw new ProfileCosmeticError(400, "Invalid profile cosmetic upload");
    const type = parseProfileCosmeticType(form.get("type"));
    const name = validateProfileCosmeticName(form.get("name"));
    const image = form.get("image");
    if (!type || !name || !(image instanceof File)) throw new ProfileCosmeticError(400, "Provide a name, type, and image");
    const asset = await createProfileCosmetic({ type, name, file: image, actor: authorization.user });
    return NextResponse.json({ success: true, asset }, { status: 201 });
  } catch (error) {
    if (error instanceof ProfileCosmeticError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    return NextResponse.json({ success: false, error: "Unable to create profile cosmetic" }, { status: 500 });
  }
}
