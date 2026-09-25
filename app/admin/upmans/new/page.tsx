import { prisma } from "@/lib/prisma";

import AddUpmanForm from "./AddUpmanForm";

export default async function NewUpmanPage() {
  const people = await prisma.person.findMany({
    orderBy: [{ displayName: "asc" }, { id: "asc" }],
    select: { id: true, displayName: true },
  });

  return <AddUpmanForm people={people} />;
}
