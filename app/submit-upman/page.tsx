import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import SubmitUpmanClient from "./SubmitUpmanClient";

export const dynamic = "force-dynamic";

export default async function SubmitUpmanPage() {
  const twitchUserId = (await auth())?.user?.twitchUserId;
  const user = twitchUserId ? await prisma.user.findUnique({ where: { twitchUserId }, select: { id: true, displayName: true } }) : null;
  const submissions = user ? await prisma.upmanSubmission.findMany({
    where: { userId: user.id }, orderBy: { createdAt: "desc" },
    select: { id: true, name: true, description: true, image: true, status: true, rarity: true, represent: true, createdAt: true, approvedUpman: { select: { slug: true, name: true } } },
  }) : [];
  return <SubmitUpmanClient displayName={user?.displayName ?? null} submissions={submissions.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))} />;
}
