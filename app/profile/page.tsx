import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sessionLogin = normalizeTwitchLogin((await auth())?.user?.name);
  if (!sessionLogin) redirect("/");

  const user = await prisma.user.findUnique({
    where: { twitchLogin: sessionLogin },
    select: { person: { select: { id: true } } },
  });

  if (user?.person) redirect(`/people/${user.person.id}`);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-20 text-center">
      <section className="rounded-[2rem] border border-sky-200 bg-white/80 p-10 shadow-xl backdrop-blur-md">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-600">My Profile</p>
        <h1 className="mt-3 text-4xl font-black text-sky-900">Your Person profile is not linked yet.</h1>
        <p className="mx-auto mt-4 max-w-xl text-sky-800">Your collection is still available while an Admin links your Twitch account to a Person.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/my-collection" className="rounded-xl bg-sky-500 px-5 py-3 font-bold text-white">Open My Collection</Link>
          <Link href="/people" className="rounded-xl border border-sky-300 bg-white px-5 py-3 font-bold text-sky-800">Explore People</Link>
        </div>
      </section>
    </main>
  );
}
