"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ADMIN_RARITY_CLASSES } from "../rarity";
import UpmanEditorModal from "./UpmanEditorModal";
import { UP_MAN_RARITIES } from "./types";
import type { ManagedUpman, PersonOption } from "./types";

type SortOption =
  | "name-asc"
  | "name-desc"
  | "newest"
  | "oldest"
  | "most-owned"
  | "least-owned";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "most-owned", label: "Most Owned" },
  { value: "least-owned", label: "Least Owned" },
];

function compareNames(first: ManagedUpman, second: ManagedUpman) {
  return first.name.localeCompare(second.name, undefined, { sensitivity: "base" });
}

function sortUpmans(upmans: ManagedUpman[], sort: SortOption) {
  return [...upmans].sort((first, second) => {
    switch (sort) {
      case "name-asc":
        return compareNames(first, second);
      case "name-desc":
        return compareNames(second, first);
      case "oldest":
        return first.createdAt.getTime() - second.createdAt.getTime();
      case "most-owned":
        return second.ownersCount - first.ownersCount || compareNames(first, second);
      case "least-owned":
        return first.ownersCount - second.ownersCount || compareNames(first, second);
      case "newest":
      default:
        return second.createdAt.getTime() - first.createdAt.getTime();
    }
  });
}

export default function UpmanManager({
  upmans,
  people,
}: {
  upmans: ManagedUpman[];
  people: PersonOption[];
}) {
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("All rarities");
  const [sort, setSort] = useState<SortOption>("newest");
  const [editingUpman, setEditingUpman] = useState<ManagedUpman | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const visibleUpmans = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = upmans.filter((upman) => {
      const matchesQuery =
        !normalizedQuery ||
        upman.name.toLowerCase().includes(normalizedQuery) ||
        upman.slug.toLowerCase().includes(normalizedQuery) ||
        upman.creator.toLowerCase().includes(normalizedQuery);
      const matchesRarity = rarity === "All rarities" || upman.rarity === rarity;

      return matchesQuery && matchesRarity;
    });

    return sortUpmans(filtered, sort);
  }, [query, rarity, sort, upmans]);

  function openEditor(upman: ManagedUpman) {
    setEditingUpman(upman);
    setNotice(null);
  }

  return (
    <main>
      <header className="flex flex-col gap-5 border-b border-sky-100 pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-600">
            Anniversary Admin
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-sky-950 sm:text-5xl">
            Upmans
          </h1>
          <p className="mt-3 text-sky-700">
            {upmans.length} {upmans.length === 1 ? "Upman" : "Upmans"} in the Dex.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/upmans/legacy"
            className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50"
          >
            Legacy tools
          </Link>
          <Link
            href="/admin/upmans/new"
            className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-600"
          >
            + Add Upman
          </Link>
        </div>
      </header>

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
              {UP_MAN_RARITIES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
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
          {visibleUpmans.length} {visibleUpmans.length === 1 ? "result" : "results"}
        </p>
      </section>

      {notice && (
        <p role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-bold text-emerald-800">
          {notice}
        </p>
      )}

      <section className="mt-6 overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm" aria-label="Upman results">
        <div className="hidden grid-cols-[64px_minmax(180px,1fr)_minmax(130px,0.7fr)_120px_110px] items-center gap-4 border-b border-sky-100 bg-sky-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-sky-600 lg:grid">
          <span>Image</span>
          <span>Upman</span>
          <span>Creator</span>
          <span>Owners</span>
          <span className="text-right">Action</span>
        </div>

        {visibleUpmans.length > 0 ? (
          <div className="divide-y divide-sky-100">
            {visibleUpmans.map((upman) => (
              <article
                key={upman.id}
                onClick={() => openEditor(upman)}
                className="grid cursor-pointer gap-4 px-4 py-4 transition hover:bg-sky-50/70 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center lg:grid-cols-[64px_minmax(180px,1fr)_minmax(130px,0.7fr)_120px_110px] lg:px-5"
              >
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-sky-100 bg-sky-50 p-1.5">
                  <Image
                    src={upman.image}
                    alt={upman.name}
                    width={56}
                    height={56}
                    className="h-full w-full object-contain"
                  />
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
                  <span className="mr-1 text-sky-500 lg:hidden">Creator:</span>
                  {upman.creator}
                </p>
                <p className="text-sm font-black text-sky-900">
                  <span className="mr-1 text-sky-500 lg:hidden">Owners:</span>
                  {upman.ownersCount}
                </p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditor(upman);
                  }}
                  className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-black text-sky-800 transition hover:bg-sky-50 lg:justify-self-end"
                >
                  Edit
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <p className="text-xl font-black text-sky-950">No Upmans found</p>
            <p className="mt-2 text-sky-700">
              Try a different search, rarity, or sort selection.
            </p>
          </div>
        )}
      </section>

      {editingUpman && (
        <UpmanEditorModal
          key={editingUpman.id}
          upman={editingUpman}
          people={people}
          onClose={() => setEditingUpman(null)}
          onComplete={setNotice}
        />
      )}
    </main>
  );
}
