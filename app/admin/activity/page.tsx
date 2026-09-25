import Link from "next/link";

import { ActivityAction, ActivityOrigin } from "@/app/generated/prisma/client";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import ActivityTimeline from "./ActivityTimeline";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 25;
const START_CURSOR = "start";

function singleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function validEnumValue<T extends Record<string, string>>(values: T, value: string | undefined) {
  return value && Object.values(values).includes(value) ? value as T[keyof T] : undefined;
}

function validCursor(value: string | undefined) {
  return value && /^[a-z0-9]+$/i.test(value) ? value : undefined;
}

function activityHref({
  query,
  action,
  origin,
  cursor,
  history,
}: {
  query: string;
  action?: ActivityAction;
  origin?: ActivityOrigin;
  cursor?: string;
  history: string[];
}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (action) params.set("action", action);
  if (origin) params.set("origin", origin);
  if (cursor) params.set("cursor", cursor);
  if (history.length > 0) params.set("history", history.join(","));

  const search = params.toString();
  return search ? `/admin/activity?${search}` : "/admin/activity";
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = (singleValue(params.q) ?? "").trim().slice(0, 80);
  const action = validEnumValue(ActivityAction, singleValue(params.action));
  const origin = validEnumValue(ActivityOrigin, singleValue(params.origin));
  const cursor = validCursor(singleValue(params.cursor));
  const history = (singleValue(params.history) ?? "")
    .split(",")
    .filter((value) => value === START_CURSOR || Boolean(validCursor(value)));

  const filters: Prisma.ActivityLogWhereInput = {
    ...(action ? { action } : {}),
    ...(origin ? { origin } : {}),
    ...(query
      ? {
          OR: [
            { actorLogin: { contains: query, mode: "insensitive" } },
            { targetLogin: { contains: query, mode: "insensitive" } },
            { upmanSlug: { contains: query, mode: "insensitive" } },
            { upmanName: { contains: query, mode: "insensitive" } },
            { personDisplayName: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const entries = await prisma.activityLog.findMany({
    where: filters,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      action: true,
      origin: true,
      actorLogin: true,
      targetLogin: true,
      upmanName: true,
      upmanSlug: true,
      personDisplayName: true,
      createdAt: true,
    },
  });

  const hasNextPage = entries.length > PAGE_SIZE;
  const activities = hasNextPage ? entries.slice(0, PAGE_SIZE) : entries;
  const nextCursor = hasNextPage ? activities.at(-1)?.id : undefined;
  const previousCursor = history.at(-1);
  const previousHistory = history.slice(0, -1);
  const currentHistory = [...history, cursor ?? START_CURSOR];

  const previousHref = previousCursor
    ? activityHref({
        query,
        action,
        origin,
        cursor: previousCursor === START_CURSOR ? undefined : previousCursor,
        history: previousHistory,
      })
    : null;
  const nextHref = nextCursor
    ? activityHref({ query, action, origin, cursor: nextCursor, history: currentHistory })
    : null;

  return (
    <main>
      <header className="flex flex-col gap-5 border-b border-sky-100 pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-600">Anniversary Admin</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-sky-950 sm:text-5xl">Activity</h1>
          <p className="mt-3 text-sky-700">A chronological record of tracked UPMANDEX mutations.</p>
        </div>
      </header>

      <form action="/admin/activity" className="mt-6 grid gap-3 rounded-3xl border border-sky-100 bg-sky-50/70 p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
        <label className="grid gap-2 text-sm font-bold text-sky-900">
          Search activity
          <input name="q" defaultValue={query} placeholder="Actor, viewer, Upman name, or slug" className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-sky-900">
          Action
          <select name="action" defaultValue={action ?? ""} className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100">
            <option value="">All actions</option>
            {Object.values(ActivityAction).map((value) => <option key={value} value={value}>{value.replace("UPMAN_", "").replace("_", " ")}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-sky-900">
          Origin
          <select name="origin" defaultValue={origin ?? ""} className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100">
            <option value="">All origins</option>
            {Object.values(ActivityOrigin).map((value) => <option key={value} value={value}>{value === "STREAMERBOT" ? "Streamer.bot" : value}</option>)}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-sky-600">Filter</button>
          <Link href="/admin/activity" className="rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-black text-sky-800 transition hover:bg-sky-50">Clear</Link>
        </div>
      </form>

      <ActivityTimeline activities={activities} previousHref={previousHref} nextHref={nextHref} />
    </main>
  );
}
