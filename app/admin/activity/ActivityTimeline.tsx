import Link from "next/link";

import type { ActivityAction, ActivityOrigin } from "@/app/generated/prisma/client";
import { formatActivityDescription } from "@/lib/activity";

type ActivityEntry = {
  id: string;
  action: ActivityAction;
  origin: ActivityOrigin;
  actorLogin: string | null;
  targetLogin: string | null;
  upmanName: string | null;
  upmanSlug: string | null;
  personDisplayName: string | null;
  createdAt: Date;
};

const originClasses: Record<ActivityOrigin, string> = {
  ADMIN: "bg-sky-100 text-sky-800",
  STREAMERBOT: "bg-violet-100 text-violet-800",
  IMPORT: "bg-amber-100 text-amber-800",
  SYSTEM: "bg-slate-100 text-slate-700",
};

const actionLabels: Record<ActivityAction, string> = {
  UPMAN_GRANTED: "Granted",
  UPMAN_REMOVED: "Removed",
  UPMAN_CREATED: "Created",
  UPMAN_UPDATED: "Updated",
  UPMAN_DELETED: "Deleted",
  PULL_RESOLVED: "Pull resolved",
  PERSON_CREATED: "Person created",
  PERSON_UPDATED: "Person updated",
  UPMAN_RELATIONSHIPS_UPDATED: "Relationships updated",
};

function formatTimestamp(value: Date) {
  return value.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityTimeline({
  activities,
  previousHref,
  nextHref,
}: {
  activities: ActivityEntry[];
  previousHref: string | null;
  nextHref: string | null;
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm" aria-label="Activity results">
      {activities.length > 0 ? (
        <div className="divide-y divide-sky-100">
          {activities.map((activity) => (
            <article key={activity.id} className="flex gap-4 px-5 py-5">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-cyan-400 ring-4 ring-cyan-50" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black text-sky-950">{formatActivityDescription(activity)}</p>
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700">
                    {actionLabels[activity.action]}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ${originClasses[activity.origin]}`}>
                    {activity.origin === "STREAMERBOT" ? "Streamer.bot" : activity.origin}
                  </span>
                </div>
                <p className="mt-2 text-sm text-sky-600">{formatTimestamp(activity.createdAt)}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="px-6 py-14 text-center">
          <p className="text-xl font-black text-sky-950">No activity found</p>
          <p className="mt-2 text-sky-700">Activity will appear here after the next tracked mutation.</p>
        </div>
      )}

      {(previousHref || nextHref) && (
        <footer className="flex items-center justify-between gap-3 border-t border-sky-100 bg-sky-50 px-5 py-4">
          {previousHref ? (
            <Link href={previousHref} className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-black text-sky-800 transition hover:bg-sky-50">
              ← Previous
            </Link>
          ) : <span />}
          {nextHref ? (
            <Link href={nextHref} className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-600">
              Next →
            </Link>
          ) : <span />}
        </footer>
      )}
    </section>
  );
}
