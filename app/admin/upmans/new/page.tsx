import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

import AddUpmanForm from "./AddUpmanForm";

export default async function NewUpmanPage() {
  const authorization = await requireAdmin();
  if (!authorization.ok) redirect("/");

  const people = await prisma.person.findMany({
    orderBy: [{ displayName: "asc" }, { id: "asc" }],
    select: { id: true, displayName: true, user: { select: { twitchLogin: true } } },
  });

  return <AddUpmanForm people={people} />;
}
