import Image from "next/image";
import Link from "next/link";

import type { ActivityAction, ActivityOrigin } from "@/app/generated/prisma/client";
import { formatActivityDescription } from "@/lib/activity";

type DashboardData = {
  totalUpmans: number;
  totalUsers: number;
  totalPeople: number;
  totalDiscoveries: number;
  globalCompletion: number;
  rarityCounts: Array<{ rarity: string; count: number }>;
  canonicalCreators: number;
  missingRepresentedPeople: number;
  mismatchCount: number;
  latestUpman: {
    name: string;
    image: string;
    rarity: string;
    creator: string;
    createdAt: Date;
  } | null;
  recentActivity: Array<{
    id: string;
    action: ActivityAction;
    origin: ActivityOrigin;
    actorLogin: string | null;
    targetLogin: string | null;
    upmanName: string | null;
    upmanSlug: string | null;
    personDisplayName: string | null;
    createdAt: Date;
  }>;
};

type AdminDashboardProps = {
  data: DashboardData;
};

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-3xl border border-sky-100 bg-gradient-to-br from-white to-sky-50 p-5 shadow-sm">
      <p className="text-sm font-bold text-sky-600">{label}</p>
      <p className="mt-3 text-4xl font-black tracking-tight text-sky-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-sky-700">{detail}</p>
    </article>
  );
}

export default function AdminDashboard({ data }: AdminDashboardProps) {
  const latestDate = data.latestUpman?.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main>
      <header className="mb-8">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-600">
          Anniversary Admin
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-sky-950 sm:text-5xl">
          Admin Studio
        </h1>
        <p className="mt-3 max-w-2xl text-sky-700">
          A clear, safe control room for the UPMANDEX anniversary environment.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Dex statistics">
        <StatCard label="Total Upmans" value={String(data.totalUpmans)} detail="Available in the Dex" />
        <StatCard label="People" value={String(data.totalPeople)} detail={`${data.canonicalCreators} structured creators`} />
        <StatCard label="Total Viewers" value={String(data.totalUsers)} detail="Registered Twitch collectors" />
        <StatCard label="Total Discoveries" value={String(data.totalDiscoveries)} detail="Unique inventory entries" />
        <StatCard
          label="Global Dex Completion"
          value={`${data.globalCompletion.toFixed(1)}%`}
          detail="Inventory out of all possible viewer × Upman discoveries"
        />
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
        <article className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-500">Dex makeup</p>
          <h2 className="mt-1 text-2xl font-black text-sky-950">Rarities in the cloud world</h2>
          <div className="mt-5 flex flex-wrap gap-2">{data.rarityCounts.map((entry) => <span key={entry.rarity} className="rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-bold text-sky-800"><strong className="text-sky-950">{entry.count}</strong> {entry.rarity}</span>)}</div>
          <Link href="/admin/upmans" className="mt-5 inline-flex rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-black text-sky-800 transition hover:bg-sky-50">Open Upman library →</Link>
        </article>
        <article className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">Relationship health</p>
          <h2 className="mt-1 text-2xl font-black text-sky-950">Associations to review</h2>
          <dl className="mt-5 grid gap-3 text-sm text-sky-800"><div className="flex justify-between gap-4"><dt>Missing represented Person</dt><dd className="font-black">{data.missingRepresentedPeople}</dd></div><div className="flex justify-between gap-4"><dt>Verified Twitch mismatches</dt><dd className="font-black">{data.mismatchCount}</dd></div></dl>
          <Link href="/admin/upmans/relationships" className="mt-5 inline-flex rounded-xl bg-amber-400 px-3 py-2 text-sm font-black text-amber-950 transition hover:bg-amber-300">Review relationships →</Link>
        </article>
      </section>

      <section className="mt-8 rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-500">Recent Activity</p>
            <h2 className="mt-1 text-2xl font-black text-sky-950">Latest tracked mutations</h2>
          </div>
          <Link href="/admin/activity" className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-black text-sky-800 transition hover:bg-sky-50">View all</Link>
        </div>

        {data.recentActivity.length > 0 ? (
          <div className="mt-5 divide-y divide-sky-100">
            {data.recentActivity.map((activity) => (
              <article key={activity.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <p className="font-bold text-sky-950">{formatActivityDescription(activity)}</p>
                <p className="shrink-0 text-sm text-sky-600">
                  {activity.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-sky-50 p-4 text-sm text-sky-700">No tracked activity yet.</p>
        )}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <article className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-500">Latest Upman</p>
              <h2 className="mt-1 text-2xl font-black text-sky-950">Most recently added</h2>
            </div>
            <span className="text-3xl" aria-hidden="true">☁️</span>
          </div>

          {data.latestUpman ? (
            <div className="mt-6 flex flex-col gap-5 rounded-3xl bg-sky-50 p-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-sky-100 bg-white">
                <Image
                  src={data.latestUpman.image}
                  alt={data.latestUpman.name}
                  width={112}
                  height={112}
                  className="h-full w-full object-contain p-2"
                />
              </div>
              <div>
                <h3 className="text-2xl font-black text-sky-950">{data.latestUpman.name}</h3>
                <p className="mt-2 font-bold text-cyan-700">{data.latestUpman.rarity}</p>
                <p className="mt-1 text-sky-700">Created by {data.latestUpman.creator}</p>
                <p className="mt-3 text-sm text-sky-600">Added {latestDate}</p>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-sky-200 bg-sky-50 p-6 text-sky-700">
              No Upmans have been added yet.
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-700">Quick Actions</p>
          <h2 className="mt-1 text-2xl font-black text-sky-950">Admin shortcuts</h2>
          <div className="mt-6 grid gap-3">
            <Link
              href="/admin/upmans/new"
              className="rounded-2xl bg-sky-500 px-4 py-3 text-center font-black text-white shadow-sm transition hover:bg-sky-600"
            >
              Add Upman →
            </Link>
            <Link
              href="/admin/upmans"
              className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-center font-black text-sky-800 transition hover:bg-sky-50"
            >
              Add Upman →
            </Link>
            <Link
              href="/admin/viewers"
              className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-center font-black text-sky-800 transition hover:bg-sky-50"
            >
              Find Viewer →
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
