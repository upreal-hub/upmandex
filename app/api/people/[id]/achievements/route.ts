import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PersonCustomizationError, updatePersonCosmeticLoadout } from "@/lib/person-customization";
import { normalizeTwitchLogin, validateAchievementCustomizationPayload } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionLogin = normalizeTwitchLogin((await auth())?.user?.name);
  if (!sessionLogin) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  const validation = validateAchievementCustomizationPayload(await request.json().catch(() => null));
  if (!validation.success) return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { twitchLogin: sessionLogin }, select: { id: true } });
  if (!user) return NextResponse.json({ success: false, error: "You can only customize your own profile" }, { status: 403 });
  try {
    await updatePersonCosmeticLoadout(id, user.id, validation.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PersonCustomizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, error: "Unable to save your choices" }, { status: 500 });
  }
}
