"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { UP_MAN_RARITIES } from "./types";
import type { ManagedUpman, PersonOption } from "./types";

type UpmanEditorModalProps = {
  upman: ManagedUpman;
  people: PersonOption[];
  onClose: () => void;
  onComplete: (message: string) => void;
};

type ApiResponse = {
  error?: string;
};

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-black uppercase tracking-wide text-sky-500">
        {label}
      </dt>
      <dd className="mt-1 break-words rounded-xl bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-950">
        {value}
      </dd>
    </div>
  );
}

export default function UpmanEditorModal({
  upman,
  people,
  onClose,
  onComplete,
}: UpmanEditorModalProps) {
  const router = useRouter();
  const [name, setName] = useState(upman.name);
  const [creator, setCreator] = useState(upman.creator);
  const [rarity, setRarity] = useState(upman.rarity);
  const [creatorPersonId, setCreatorPersonId] = useState(upman.creatorPersonId ?? "");
  const [representedPersonId, setRepresentedPersonId] = useState(upman.representedPersonId ?? "");
  const [confirmRepresentedPersonRemoval, setConfirmRepresentedPersonRemoval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [, startTransition] = useTransition();
  const isMutating = isSaving || isDeleting;

  const createdAt = upman.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function closeIfIdle() {
    if (!isMutating) {
      onClose();
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isMutating) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMutating, onClose]);

  async function readResponse(response: Response): Promise<ApiResponse> {
    return (await response.json()) as ApiResponse;
  }

  async function saveChanges(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/edit-upman", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: upman.slug,
          name,
          creator,
          rarity,
          creatorPersonId: creatorPersonId || null,
          representedPersonId: representedPersonId || null,
          confirmRepresentedPersonRemoval,
        }),
      });
      const data = await readResponse(response);

      if (!response.ok) {
        setError(data.error ?? "Unable to save this Upman.");
        return;
      }

      onClose();
      onComplete(`${name} was updated.`);
      startTransition(() => router.refresh());
    } catch {
      setError("Unable to save this Upman. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteUpman() {
    if (deleteConfirmation !== upman.name) {
      setError(`Type “${upman.name}” to confirm deletion.`);
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      const response = await fetch("/api/delete-upman", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: upman.slug }),
      });
      const data = await readResponse(response);

      if (!response.ok) {
        setError(data.error ?? "Unable to delete this Upman.");
        return;
      }

      onClose();
      onComplete(`${upman.name} was deleted.`);
      startTransition(() => router.refresh());
    } catch {
      setError("Unable to delete this Upman. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/30 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onClick={closeIfIdle}
    >
      <section
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-white bg-[#fffdf7] p-5 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upman-editor-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600">
              Upman editor
            </p>
            <h2 id="upman-editor-title" className="mt-1 text-3xl font-black text-sky-950">
              {upman.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeIfIdle}
            disabled={isMutating}
            className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-black text-sky-800 transition hover:bg-sky-50"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[180px_minmax(0,1fr)]">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-sky-100 bg-white p-4">
            <Image
              src={upman.image}
              alt={upman.name}
              width={160}
              height={160}
              className="h-full w-full object-contain"
            />
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <ReadOnlyField label="Slug" value={upman.slug} />
            <ReadOnlyField label="Image" value={upman.image} />
            <ReadOnlyField
              label="Creator Twitch"
              value={upman.creatorTwitch ?? "Not set"}
            />
            <ReadOnlyField label="Owners" value={String(upman.ownersCount)} />
            <ReadOnlyField
              label="First Owner"
              value={upman.firstOwner ?? "Not discovered yet"}
            />
            <ReadOnlyField label="Added" value={createdAt} />
          </dl>
        </div>

        <form onSubmit={saveChanges} className="mt-8 rounded-3xl border border-sky-100 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-sky-950">Editable details</h3>
              <p className="mt-1 text-sm text-sky-700">
                Only the fields supported by the current Admin API can be changed.
              </p>
            </div>
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800">
              Editable
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-sky-900">
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={120}
                className="rounded-xl border border-sky-200 bg-[#fffdf7] px-3 py-2 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-sky-900">
              Creator
              <input
                value={creator}
                onChange={(event) => setCreator(event.target.value)}
                required
                maxLength={120}
                className="rounded-xl border border-sky-200 bg-[#fffdf7] px-3 py-2 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-sky-900 sm:col-span-2">
              Rarity
              <select
                value={rarity}
                onChange={(event) => {
                  const nextRarity = event.target.value;
                  setRarity(nextRarity);
                  if (nextRarity === "Common" && representedPersonId) {
                    setRepresentedPersonId("");
                    setConfirmRepresentedPersonRemoval(false);
                  }
                }}
                className="rounded-xl border border-sky-200 bg-[#fffdf7] px-3 py-2 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                {UP_MAN_RARITIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {upman.representedPersonId && rarity === "Common" && (
            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              <input
                type="checkbox"
                checked={confirmRepresentedPersonRemoval}
                onChange={(event) => setConfirmRepresentedPersonRemoval(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-amber-500"
              />
              <span>I confirm that making this Upman Common removes its represented Person.</span>
            </label>
          )}

          <section className="mt-6 rounded-3xl border border-cyan-100 bg-cyan-50/60 p-5" aria-labelledby="relationships-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">Relationships</p>
                <h3 id="relationships-title" className="mt-1 text-xl font-black text-sky-950">Canonical people</h3>
                <p className="mt-1 text-sm text-sky-700">These optional links do not rewrite the legacy attribution above.</p>
              </div>
              <Link href="/admin/people" className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-black text-sky-800 transition hover:bg-cyan-50">
                Manage people
              </Link>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-sky-900">
                Creator Person
                <select value={creatorPersonId} onChange={(event) => setCreatorPersonId(event.target.value)} className="rounded-xl border border-sky-200 bg-[#fffdf7] px-3 py-2 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100">
                  <option value="">None — legacy creator only</option>
                  {people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
                </select>
                <span className="text-xs font-medium text-sky-600">Legacy: {upman.creator}{upman.creatorTwitch ? ` · @${upman.creatorTwitch}` : ""}</span>
              </label>
              <label className="grid gap-2 text-sm font-bold text-sky-900">
                Represented Person
                <select value={representedPersonId} disabled={rarity === "Common"} onChange={(event) => setRepresentedPersonId(event.target.value)} className="rounded-xl border border-sky-200 bg-[#fffdf7] px-3 py-2 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60">
                  <option value="">None</option>
                  {people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
                </select>
                <span className="text-xs font-medium text-sky-600">{rarity === "Common" ? "Not applicable — Common Upmans cannot represent a Person." : "This is independent from the creator."}</span>
              </label>
            </div>
          </section>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={closeIfIdle}
              disabled={isMutating}
              className="rounded-xl border border-sky-200 bg-white px-4 py-2 font-black text-sky-800 transition hover:bg-sky-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isDeleting}
              className="rounded-xl bg-sky-500 px-4 py-2 font-black text-white transition hover:bg-sky-600 disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>

        <section className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-5" aria-labelledby="danger-zone-title">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-600">Danger Zone</p>
              <h3 id="danger-zone-title" className="mt-1 text-xl font-black text-rose-950">
                Delete Upman
              </h3>
              <p className="mt-1 max-w-lg text-sm text-rose-800">
                This deletes the Upman and its inventory entries using the existing Admin API.
              </p>
            </div>
            {!confirmingDelete && (
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(true);
                  setError(null);
                }}
                className="rounded-xl border border-rose-300 bg-white px-4 py-2 font-black text-rose-700 transition hover:bg-rose-100"
              >
                Delete Upman
              </button>
            )}
          </div>

          {confirmingDelete && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-white/80 p-4">
              <label className="grid gap-2 text-sm font-bold text-rose-950">
                Type <span className="font-black">{upman.name}</span> to confirm deletion
                <input
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-slate-800 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                />
              </label>
              <div className="mt-4 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeleteConfirmation("");
                    setError(null);
                  }}
                  className="rounded-xl border border-rose-200 bg-white px-4 py-2 font-black text-rose-800 transition hover:bg-rose-100"
                >
                  Keep Upman
                </button>
                <button
                  type="button"
                  onClick={deleteUpman}
                  disabled={isDeleting || deleteConfirmation !== upman.name}
                  className="rounded-xl bg-rose-600 px-4 py-2 font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? "Deleting…" : "Permanently delete"}
                </button>
              </div>
            </div>
          )}
        </section>
      </section>
    </div>,
    document.body
  );
}
