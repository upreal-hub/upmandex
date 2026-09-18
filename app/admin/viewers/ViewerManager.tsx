"use client";

import { useMemo, useState } from "react";

import ViewerDetailsModal from "./ViewerDetailsModal";
import type { ViewerSummary } from "./types";

type SortOption =
  | "name-asc"
  | "name-desc"
  | "most-upmans"
  | "least-upmans"
  | "newest"
  | "oldest"
  | "latest-discovery";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "most-upmans", label: "Most Upmans" },
  { value: "least-upmans", label: "Least Upmans" },
  { value: "newest", label: "Newest viewer" },
  { value: "oldest", label: "Oldest viewer" },
  { value: "latest-discovery", label: "Latest discovery" },
];

function compareViewers(first: ViewerSummary, second: ViewerSummary) {
  return (
    first.displayName.localeCompare(second.displayName, undefined, {
      sensitivity: "base",
    }) || first.twitchLogin.localeCompare(second.twitchLogin)
  );
}

function formatDate(value: Date | string | null) {
  if (!value) return "No discoveries yet";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ViewerAvatar({
  viewer,
  size = "h-12 w-12",
}: {
  viewer: ViewerSummary;
  size?: string;
}) {
  const initial = viewer.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-sky-100 font-black text-sky-700 ${size}`}>
      <span aria-hidden="true">{initial}</span>
      {viewer.avatar && (
        <img
          src={viewer.avatar}
          alt={`${viewer.displayName}'s avatar`}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}

function sortViewers(viewers: ViewerSummary[], sort: SortOption) {
  return [...viewers].sort((first, second) => {
    switch (sort) {
      case "name-desc":
        return compareViewers(second, first);
      case "most-upmans":
        return second.ownedCount - first.ownedCount || compareViewers(first, second);
      case "least-upmans":
        return first.ownedCount - second.ownedCount || compareViewers(first, second);
      case "newest":
        return second.createdAt.getTime() - first.createdAt.getTime() || compareViewers(first, second);
      case "oldest":
        return first.createdAt.getTime() - second.createdAt.getTime() || compareViewers(first, second);
      case "latest-discovery": {
        if (!first.latestDiscoveryAt) {
          return second.latestDiscoveryAt ? 1 : compareViewers(first, second);
        }
        if (!second.latestDiscoveryAt) return -1;

        return (
          second.latestDiscoveryAt.getTime() - first.latestDiscoveryAt.getTime() ||
          compareViewers(first, second)
        );
      }
      case "name-asc":
      default:
        return compareViewers(first, second);
    }
  });
}

export default function ViewerManager({
  viewers,
  totalUpmans,
}: {
  viewers: ViewerSummary[];
  totalUpmans: number;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("name-asc");
  const [selectedViewer, setSelectedViewer] = useState<ViewerSummary | null>(null);

  const visibleViewers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = viewers.filter(
      (viewer) =>
        !normalizedQuery ||
        viewer.displayName.toLowerCase().includes(normalizedQuery) ||
        viewer.twitchLogin.toLowerCase().includes(normalizedQuery)
    );

    return sortViewers(filtered, sort);
  }, [query, sort, viewers]);

  return (
    <main>
      <header className="flex flex-col gap-5 border-b border-sky-100 pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-600">
            Anniversary Admin
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-sky-950 sm:text-5xl">
            Viewers
          </h1>
          <p className="mt-3 text-sky-700">
            {viewers.length} {viewers.length === 1 ? "viewer" : "viewers"} registered in UPMANDEX.
          </p>
        </div>
      </header>

      <section className="mt-6 rounded-3xl border border-sky-100 bg-sky-50/70 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="grid gap-2 text-sm font-bold text-sky-900">
            Search viewers
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by display name or Twitch login"
              className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-sky-900">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-4 text-sm font-bold text-sky-700">
          {visibleViewers.length} {visibleViewers.length === 1 ? "result" : "results"}
        </p>
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm" aria-label="Viewer results">
        <div className="hidden grid-cols-[56px_minmax(180px,1fr)_130px_130px_130px_88px] items-center gap-4 border-b border-sky-100 bg-sky-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-sky-600 lg:grid">
          <span>Avatar</span>
          <span>Viewer</span>
          <span>Collection</span>
          <span>Joined</span>
          <span>Last discovery</span>
          <span className="text-right">Action</span>
        </div>

        {visibleViewers.length > 0 ? (
          <div className="divide-y divide-sky-100">
            {visibleViewers.map((viewer) => (
              <article
                key={viewer.id}
                onClick={() => setSelectedViewer(viewer)}
                className="grid cursor-pointer gap-4 px-4 py-4 transition hover:bg-sky-50/70 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center lg:grid-cols-[56px_minmax(180px,1fr)_130px_130px_130px_88px] lg:px-5"
              >
                <ViewerAvatar viewer={viewer} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-black text-sky-950">{viewer.displayName}</h2>
                    {viewer.role === "ADMIN" && (
                      <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-black text-cyan-800">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-sky-600">@{viewer.twitchLogin}</p>
                </div>
                <div className="text-sm text-sky-800">
                  <p className="font-black text-sky-950">{viewer.ownedCount} / {totalUpmans}</p>
                  <p className="mt-1 text-xs font-bold text-cyan-700">{viewer.completion.toFixed(1)}% complete</p>
                </div>
                <p className="text-sm font-semibold text-sky-800">
                  <span className="mr-1 text-sky-500 lg:hidden">Joined:</span>
                  {formatDate(viewer.createdAt)}
                </p>
                <p className="text-sm font-semibold text-sky-800">
                  <span className="mr-1 text-sky-500 lg:hidden">Latest:</span>
                  {formatDate(viewer.latestDiscoveryAt)}
                </p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedViewer(viewer);
                  }}
                  className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-black text-sky-800 transition hover:bg-sky-50 lg:justify-self-end"
                >
                  View
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <p className="text-xl font-black text-sky-950">No viewers found</p>
            <p className="mt-2 text-sky-700">Try a different display name or Twitch login.</p>
          </div>
        )}
      </section>

      {selectedViewer && (
        <ViewerDetailsModal
          key={selectedViewer.twitchLogin}
          viewer={selectedViewer}
          onClose={() => setSelectedViewer(null)}
        />
      )}
    </main>
  );
}
