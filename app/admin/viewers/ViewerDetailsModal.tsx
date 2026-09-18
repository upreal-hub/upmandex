"use client";

import { useEffect, useRef, useState } from "react";

import type { ViewerDetails, ViewerSummary } from "./types";

const rarityClasses: Record<string, string> = {
  Common: "bg-slate-100 text-slate-700",
  Rare: "bg-sky-100 text-sky-700",
  Epic: "bg-violet-100 text-violet-700",
  Mythic: "bg-amber-100 text-amber-800",
  Legendary: "bg-rose-100 text-rose-700",
};

function formatDate(value: string | null) {
  if (!value) return "No discoveries yet";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ViewerAvatar({ viewer }: { viewer: ViewerSummary }) {
  const initial = viewer.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-sky-100 text-3xl font-black text-sky-700">
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

export default function ViewerDetailsModal({
  viewer,
  onClose,
}: {
  viewer: ViewerSummary;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<ViewerDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;

    async function loadDetails() {
      try {
        const response = await fetch(
          `/api/admin-viewers/${encodeURIComponent(viewer.twitchLogin)}`,
          { signal: controller.signal }
        );
        const payload = (await response.json()) as ViewerDetails | { error?: string };

        if (!response.ok) {
          throw new Error("error" in payload ? payload.error : "Unable to load viewer details");
        }

        if (requestId.current === currentRequest) {
          setDetails(payload as ViewerDetails);
        }
      } catch (caughtError) {
        if (controller.signal.aborted || requestId.current !== currentRequest) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load viewer details"
        );
      }
    }

    void loadDetails();

    return () => {
      controller.abort();
    };
  }, [viewer.twitchLogin]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-sky-950/25 p-3 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Viewer details for ${viewer.displayName}`}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-white bg-[#fffdf7] p-5 shadow-2xl shadow-sky-950/20 sm:p-7"
      >
        <div className="flex items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <ViewerAvatar viewer={viewer} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-2xl font-black text-sky-950">{viewer.displayName}</h2>
                {viewer.role === "ADMIN" && (
                  <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-black text-cyan-800">Admin</span>
                )}
              </div>
              <p className="mt-1 text-sm font-bold text-sky-600">@{viewer.twitchLogin}</p>
              <p className="mt-2 text-sm text-sky-700">Joined UPMANDEX {formatDate(viewer.createdAt.toISOString())}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-black text-sky-800 transition hover:bg-sky-50"
          >
            Close
          </button>
        </div>

        {!details && !error && (
          <div className="mt-7 rounded-3xl border border-sky-100 bg-sky-50 p-7 text-center text-sky-700">
            Loading viewer details…
          </div>
        )}

        {error && (
          <div role="alert" className="mt-7 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
            <p className="font-black">Unable to load this viewer</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {details && (
          <div className="mt-7 space-y-6">
            <section className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-sky-100 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-sky-500">Collection</p>
                <p className="mt-2 text-3xl font-black text-sky-950">{details.ownedCount}</p>
                <p className="mt-1 text-sm text-sky-700">Unique discoveries</p>
              </article>
              <article className="rounded-2xl border border-sky-100 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-sky-500">Completion</p>
                <p className="mt-2 text-3xl font-black text-sky-950">{details.completion.toFixed(1)}%</p>
                <p className="mt-1 text-sm text-sky-700">Of the current Dex</p>
              </article>
              <article className="rounded-2xl border border-sky-100 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-sky-500">Latest discovery</p>
                <p className="mt-2 text-sm font-black text-sky-950">{details.latestDiscovery?.upman.name ?? "None yet"}</p>
                <p className="mt-1 text-sm text-sky-700">{formatDate(details.latestDiscovery?.obtainedAt ?? null)}</p>
              </article>
            </section>

            {details.latestDiscovery && (
              <section className="rounded-3xl border border-sky-100 bg-sky-50 p-5">
                <p className="text-xs font-black uppercase tracking-wide text-sky-500">Most recent Upman</p>
                <div className="mt-4 flex items-center gap-4">
                  <img
                    src={details.latestDiscovery.upman.image}
                    alt={details.latestDiscovery.upman.name}
                    className="h-16 w-16 rounded-2xl border border-sky-100 bg-white object-contain p-1"
                  />
                  <div>
                    <p className="font-black text-sky-950">{details.latestDiscovery.upman.name}</p>
                    <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-black ${rarityClasses[details.latestDiscovery.upman.rarity] ?? "bg-sky-100 text-sky-700"}`}>
                      {details.latestDiscovery.upman.rarity}
                    </span>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-sky-100 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-wide text-sky-500">Rarity breakdown</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {Object.entries(details.rarityBreakdown).map(([rarity, count]) => (
                  <div key={rarity} className={`rounded-2xl px-3 py-3 text-center text-sm font-black ${rarityClasses[rarity] ?? "bg-sky-100 text-sky-700"}`}>
                    <p>{count}</p>
                    <p className="mt-1 text-xs">{rarity}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-sky-100 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-wide text-sky-500">Recent discoveries</p>
              {details.recentDiscoveries.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {details.recentDiscoveries.map((discovery) => (
                    <div key={`${discovery.upman.slug}-${discovery.obtainedAt}`} className="flex items-center gap-3 rounded-2xl bg-sky-50 p-3">
                      <img
                        src={discovery.upman.image}
                        alt={discovery.upman.name}
                        className="h-11 w-11 rounded-xl border border-sky-100 bg-white object-contain p-1"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black text-sky-950">{discovery.upman.name}</p>
                        <p className="mt-1 text-xs text-sky-700">{formatDate(discovery.obtainedAt)}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${rarityClasses[discovery.upman.rarity] ?? "bg-sky-100 text-sky-700"}`}>
                        {discovery.upman.rarity}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl bg-sky-50 p-4 text-sm text-sky-700">No discoveries yet.</p>
              )}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
