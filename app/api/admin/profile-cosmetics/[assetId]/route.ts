import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authorization";
import { deleteProfileCosmetic, ProfileCosmeticError, renameProfileCosmetic, replaceProfileCosmetic, validateProfileCosmeticName } from "@/lib/profile-cosmetics";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const authorization = await requireAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const { assetId } = await params;
    const form = await request.formData();
    const action = form.get("action");
    if (action === "rename") {
      if ([...form.keys()].some((key) => key !== "action" && key !== "name")) throw new ProfileCosmeticError(400, "Invalid rename request");
      const name = validateProfileCosmeticName(form.get("name"));
      if (!name) throw new ProfileCosmeticError(400, "Name must be between 1 and 80 characters");
      return NextResponse.json({ success: true, asset: await renameProfileCosmetic(assetId, name, authorization.user) });
    }
    if (action === "replace") {
      if ([...form.keys()].some((key) => key !== "action" && key !== "image")) throw new ProfileCosmeticError(400, "Invalid replace request");
      const image = form.get("image");
      if (!(image instanceof File)) throw new ProfileCosmeticError(400, "Choose an image to replace this cosmetic");
      const result = await replaceProfileCosmetic(assetId, image, authorization.user);
      return NextResponse.json({ success: true, ...result });
    }
    throw new ProfileCosmeticError(400, "Invalid profile cosmetic action");
  } catch (error) {
    if (error instanceof ProfileCosmeticError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    return NextResponse.json({ success: false, error: "Unable to update profile cosmetic" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const authorization = await requireAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const { assetId } = await params;
    const result = await deleteProfileCosmetic(assetId, authorization.user);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof ProfileCosmeticError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    return NextResponse.json({ success: false, error: "Unable to delete profile cosmetic" }, { status: 500 });
  }
}
