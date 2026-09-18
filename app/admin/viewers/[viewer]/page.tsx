import Link from "next/link";
import { notFound } from "next/navigation";

import { normalizeTwitchLogin } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

import CollectionEditor from "./CollectionEditor";
import ViewerAvatar from "../ViewerAvatar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CollectionEditorPage({
  params,
}: {
  params: Promise<{ viewer: string }>;
}) {
  const { viewer } = await params;
  const twitchLogin = normalizeTwitchLogin(viewer);

  if (!twitchLogin) {
    notFound();
  }

  const [user, upmans] = await Promise.all([
    prisma.user.findUnique({
      where: { twitchLogin },
      select: {
        twitchLogin: true,
        displayName: true,
        avatar: true,
        role: true,
        inventory: { select: { upmanId: true } },
      },
    }),
    prisma.upman.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        image: true,
        rarity: true,
        creator: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <main>
      <Link
        href="/admin/viewers"
        className="inline-flex rounded-2xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-black text-sky-800 transition hover:bg-sky-50"
      >
        ← Back to Viewers
      </Link>

      <header className="mt-6 flex flex-col gap-5 border-b border-sky-100 pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <ViewerAvatar viewer={user} />
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-600">
              Anniversary Admin
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="truncate text-3xl font-black tracking-tight text-sky-950 sm:text-4xl">
                Collection Editor
              </h1>
              {user.role === "ADMIN" && (
                <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-black text-cyan-800">
                  Admin
                </span>
              )}
            </div>
            <p className="mt-2 truncate font-bold text-sky-700">
              {user.displayName} <span className="text-sky-500">@{user.twitchLogin}</span>
            </p>
          </div>
        </div>
      </header>

      <CollectionEditor
        viewer={{
          twitchLogin: user.twitchLogin,
          displayName: user.displayName,
          avatar: user.avatar,
        }}
        upmans={upmans}
        ownedUpmanIds={user.inventory.map((entry) => entry.upmanId)}
      />
    </main>
  );
}
