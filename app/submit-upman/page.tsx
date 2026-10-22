import { auth } from "@/auth";
import { normalizeTwitchLogin } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

import SubmitUpmanClient from "./SubmitUpmanClient";

export const dynamic = "force-dynamic";

export default async function SubmitUpmanPage() {
  const login = normalizeTwitchLogin((await auth())?.user?.name);
  const user = login ? await prisma.user.findUnique({ where: { twitchLogin: login }, select: { displayName: true } }) : null;
  const submissions = user ? await prisma.upmanSubmission.findMany({
    where: { user: { twitchLogin: login! } }, orderBy: { createdAt: "desc" },
    select: { id: true, name: true, description: true, image: true, status: true, rarity: true, represent: true, createdAt: true, approvedUpman: { select: { slug: true, name: true } } },
  }) : [];
  return <SubmitUpmanClient displayName={user?.displayName ?? null} submissions={submissions.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))} />;
}
