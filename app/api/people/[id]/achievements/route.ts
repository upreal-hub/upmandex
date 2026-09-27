import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin, validateAchievementCustomizationPayload } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionLogin = normalizeTwitchLogin((await auth())?.user?.name);
  if (!sessionLogin) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  const validation = validateAchievementCustomizationPayload(await request.json().catch(() => null));
  if (!validation.success) return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  const { id } = await params;
  const [user, person] = await Promise.all([
    prisma.user.findUnique({ where: { twitchLogin: sessionLogin }, select: { id: true } }),
    prisma.person.findUnique({ where: { id }, select: { userId: true } }),
  ]);
  if (!person) return NextResponse.json({ success: false, error: "Person not found" }, { status: 404 });
  if (!user || person.userId !== user.id) return NextResponse.json({ success: false, error: "You can only customize your own profile" }, { status: 403 });
  const keys = [validation.data.equippedTitleAchievementKey, ...validation.data.featuredAchievementKeys].filter((key): key is string => Boolean(key));
  const unlocked = await prisma.personAchievement.findMany({ where: { personId: id, achievementKey: { in: keys } }, select: { achievementKey: true } });
  if (unlocked.length !== new Set(keys).size) return NextResponse.json({ success: false, error: "Choose only unlocked achievements" }, { status: 400 });
  await prisma.person.update({ where: { id }, data: validation.data });
  return NextResponse.json({ success: true });
}
