"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ADMIN_RARITY_CLASSES } from "../../rarity";
type CollectionUpman = {
  id: string;
  slug: string;
  name: string;
  image: string;
  rarity: string;
  creator: string;
};

type OwnershipFilter = "all" | "owned" | "missing";

const rarities = ["Common", "Rare", "Epic", "Mythic", "Legendary"];

function responseMessage(status: string) {
  switch (status) {
    case "granted":
      return "Upman added.";
    case "already-owned":
      return "Already owned.";
    case "removed":
      return "Upman removed.";
    case "not-owned":
      return "Already missing.";
    default:
      return "Collection updated.";
  }
}

export default function CollectionEditor({
  viewer,
  upmans,
  ownedUpmanIds,
}: {
  viewer: { twitchLogin: string; displayName: string; avatar: string | null };
  upmans: CollectionUpman[];
  ownedUpmanIds: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("All rarities");
  const [ownership, setOwnership] = useState<OwnershipFilter>("all");
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();

  const ownedIds = useMemo(() => new Set(ownedUpmanIds), [ownedUpmanIds]);
  const ownedCount = ownedIds.size;
  const completion = upmans.length > 0 ? (ownedCount / upmans.length) * 100 : 0;
  const isBusy = pendingSlug !== null || isRefreshing;

  const visibleUpmans = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return upmans.filter((upman) => {
      const isOwned = ownedIds.has(upman.id);
      const matchesQuery =
        !normalizedQuery ||
        upman.name.toLowerCase().includes(normalizedQuery) ||
        upman.slug.toLowerCase().includes(normalizedQuery) ||
        upman.creator.toLowerCase().includes(normalizedQuery);
      const matchesRarity = rarity === "All rarities" || upman.rarity === rarity;
      const matchesOwnership =
        ownership === "all" ||
        (ownership === "owned" && isOwned) ||
        (ownership === "missing" && !isOwned);

      return matchesQuery && matchesRarity && matchesOwnership;
    });
  }, [ownedIds, ownership, query, rarity, upmans]);

  async function updateCollection(upman: CollectionUpman, isOwned: boolean) {
    if (isBusy) return;

    setPendingSlug(upman.slug);
    setNotice(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin-viewers/${encodeURIComponent(viewer.twitchLogin)}/collection`,
        {
          method: isOwned ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: upman.slug }),
        }
      );
      const payload = (await response.json()) as {
        success?: boolean;
        status?: string;
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.status) {
        if (response.status === 409) {
          setError("Collection changed elsewhere. Refreshing...");
          startTransition(() => router.refresh());
          return;
        }

        setError(payload.error ?? "Could not update collection");
        return;
      }

      setNotice(responseMessage(payload.status));
      startTransition(() => router.refresh());
    } catch {
      setError("Could not update collection");
    } finally {
      setPendingSlug(null);
    }
  }

  return (
    <section className="mt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl border border-sky-100 bg-sky-50 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-sky-500">Collection</p>
          <p className="mt-2 text-3xl font-black text-sky-950">{ownedCount} / {upmans.length}</p>
          <p className="mt-1 text-sm text-sky-700">Unique discoveries</p>
        </article>
        <article className="rounded-3xl border border-sky-100 bg-sky-50 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-sky-500">Completion</p>
          <p className="mt-2 text-3xl font-black text-sky-950">{completion.toFixed(1)}%</p>
          <p className="mt-1 text-sm text-sky-700">Of the current Dex</p>
        </article>
      </div>

      <section className="mt-6 rounded-3xl border border-sky-100 bg-sky-50/70 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="grid gap-2 text-sm font-bold text-sky-900">
            Search Upmans
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, slug, or creator"
              className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-sky-900">
            Rarity
            <select
              value={rarity}
              onChange={(event) => setRarity(event.target.value)}
              className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              <option>All rarities</option>
              {rarities.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-sky-900">
            Ownership
            <select
              value={ownership}
              onChange={(event) => setOwnership(event.target.value as OwnershipFilter)}
              className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              <option value="all">All</option>
              <option value="owned">Owned</option>
              <option value="missing">Missing</option>
            </select>
          </label>
        </div>
        <p className="mt-4 text-sm font-bold text-sky-700">
          {visibleUpmans.length} {visibleUpmans.length === 1 ? "result" : "results"}
        </p>
      </section>

      {notice && (
        <p role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-bold text-emerald-800">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 font-bold text-rose-800">
          {error}
        </p>
      )}

      <section className="mt-6 overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm" aria-label={`${viewer.displayName}'s collection`}>
        <div className="hidden grid-cols-[64px_minmax(180px,1fr)_minmax(130px,0.7fr)_110px_100px] items-center gap-4 border-b border-sky-100 bg-sky-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-sky-600 lg:grid">
          <span>Image</span>
          <span>Upman</span>
          <span>Creator</span>
          <span>Status</span>
          <span className="text-right">Action</span>
        </div>

        {visibleUpmans.length > 0 ? (
          <div className="divide-y divide-sky-100">
            {visibleUpmans.map((upman) => {
              const isOwned = ownedIds.has(upman.id);
              const isPending = pendingSlug === upman.slug;

              return (
                <article
                  key={upman.id}
                  className="grid gap-4 px-4 py-4 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center lg:grid-cols-[64px_minmax(180px,1fr)_minmax(130px,0.7fr)_110px_100px] lg:px-5"
                >
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-sky-100 bg-sky-50 p-1.5">
                    <Image src={upman.image} alt={upman.name} width={56} height={56} className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-black text-sky-950">{upman.name}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${ADMIN_RARITY_CLASSES[upman.rarity] ?? "bg-sky-100 text-sky-700"}`}>
                        {upman.rarity}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-sky-600">/{upman.slug}</p>
                  </div>
                  <p className="text-sm font-semibold text-sky-800">
                    <span className="mr-1 text-sky-500 lg:hidden">Creator:</span>{upman.creator}
                  </p>
                  <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-black ${isOwned ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                    {isOwned ? "Owned" : "Missing"}
                  </span>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void updateCollection(upman, isOwned)}
                    className={`rounded-xl px-3 py-2 text-sm font-black transition disabled:cursor-wait disabled:opacity-60 lg:justify-self-end ${isOwned ? "border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100" : "bg-sky-500 text-white hover:bg-sky-600"}`}
                  >
                    {isPending ? "Updating..." : isOwned ? "Remove" : "Add"}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <p className="text-xl font-black text-sky-950">No Upmans found</p>
            <p className="mt-2 text-sky-700">Try a different search, rarity, or ownership filter.</p>
          </div>
        )}
      </section>
    </section>
  );
}
