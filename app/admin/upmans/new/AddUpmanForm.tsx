"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { UP_MAN_RARITIES } from "../types";
import type { PersonOption } from "../types";

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidPng(file: File): boolean {
  return (
    file.type === "image/png" &&
    file.name.toLowerCase().endsWith(".png") &&
    file.size > 0 &&
    file.size <= MAX_IMAGE_SIZE
  );
}

export default function AddUpmanForm({ people }: { people: PersonOption[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [rarity, setRarity] = useState("Common");
  const [creator, setCreator] = useState("");
  const [creatorTwitch, setCreatorTwitch] = useState("");
  const [creatorPersonId, setCreatorPersonId] = useState("");
  const [representedPersonId, setRepresentedPersonId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function selectImage(file: File | undefined) {
    setError(null);

    if (!file) {
      return;
    }

    if (!isValidPng(file)) {
      setImage(null);
      setPreviewUrl(null);
      setError("Choose a PNG image no larger than 4 MiB.");
      return;
    }

    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!image) {
      setError("Choose a PNG image before creating the Upman.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("image", image);
      formData.set("name", name);
      formData.set("slug", slug);
      formData.set("rarity", rarity);
      formData.set("creator", creator);
      formData.set("creatorTwitch", creatorTwitch);
      formData.set("creatorPersonId", creatorPersonId);
      formData.set("representedPersonId", representedPersonId);

      const response = await fetch("/api/admin-upmans/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Unable to create the Upman.");
        return;
      }

      router.push("/admin/upmans");
      router.refresh();
    } catch {
      setError("Unable to create the Upman. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="max-w-4xl">
      <header className="flex flex-col gap-5 border-b border-sky-100 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-600">
            Anniversary Admin
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-sky-950 sm:text-5xl">
            Add Upman
          </h1>
          <p className="mt-3 text-sky-700">
            Upload a PNG and create its Dex entry in one secure step.
          </p>
        </div>
        <Link
          href="/admin/upmans"
          className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-center text-sm font-black text-sky-800 transition hover:bg-sky-50"
        >
          ← Back to Upmans
        </Link>
      </header>

      <form onSubmit={submit} className="mt-7 space-y-6">
        <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-sky-950">Image</h2>
          <p className="mt-1 text-sm text-sky-700">PNG only, up to 4 MiB.</p>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,.png"
            className="sr-only"
            onChange={(event) => selectImage(event.target.files?.[0])}
          />

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              selectImage(event.dataTransfer.files[0]);
            }}
            className={`mt-5 rounded-3xl border-2 border-dashed p-6 text-center transition ${
              isDragging
                ? "border-sky-500 bg-sky-50"
                : "border-sky-200 bg-[#fffdf7]"
            }`}
          >
            {previewUrl ? (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:text-left">
                <div
                  role="img"
                  aria-label="Selected Upman image preview"
                  className="h-32 w-32 shrink-0 rounded-2xl border border-sky-100 bg-white bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${previewUrl})` }}
                />
                <div>
                  <p className="font-black text-sky-950">{image?.name}</p>
                  <p className="mt-1 text-sm text-sky-700">
                    {image ? `${Math.ceil(image.size / 1024)} KiB` : "PNG selected"}
                  </p>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="mt-3 rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-black text-sky-800 transition hover:bg-sky-50"
                  >
                    Choose another image
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-lg font-black text-sky-950">Drop a PNG here</p>
                <p className="mt-1 text-sm text-sky-700">or choose it from your computer</p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-4 rounded-xl bg-sky-500 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-600"
                >
                  Select PNG
                </button>
              </>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-sky-950">Dex details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-sky-900 sm:col-span-2">
              Name
              <input
                value={name}
                onChange={(event) => {
                  const nextName = event.target.value;
                  setName(nextName);
                  if (!isSlugEdited) {
                    setSlug(slugify(nextName));
                  }
                }}
                required
                maxLength={120}
                className="rounded-xl border border-sky-200 bg-[#fffdf7] px-3 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-sky-900 sm:col-span-2">
              Slug
              <input
                value={slug}
                onChange={(event) => {
                  setIsSlugEdited(true);
                  setSlug(event.target.value.toLowerCase());
                }}
                required
                maxLength={80}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                className="rounded-xl border border-sky-200 bg-[#fffdf7] px-3 py-2.5 font-mono text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              <span className="text-xs font-medium text-sky-600">
                Generated from the name; you can adjust it before creation.
              </span>
            </label>
            <label className="grid gap-2 text-sm font-bold text-sky-900">
              Rarity
              <select
                value={rarity}
                onChange={(event) => setRarity(event.target.value)}
                className="rounded-xl border border-sky-200 bg-[#fffdf7] px-3 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                {UP_MAN_RARITIES.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-sky-900">
              Creator
              <input
                value={creator}
                onChange={(event) => setCreator(event.target.value)}
                required
                maxLength={120}
                className="rounded-xl border border-sky-200 bg-[#fffdf7] px-3 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-sky-900 sm:col-span-2">
              Creator Twitch <span className="font-medium text-sky-500">Optional</span>
              <input
                value={creatorTwitch}
                onChange={(event) => setCreatorTwitch(event.target.value)}
                maxLength={25}
                placeholder="twitch_login"
                className="rounded-xl border border-sky-200 bg-[#fffdf7] px-3 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              <span className="text-xs font-medium text-sky-600">
                Stored in lowercase when provided.
              </span>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-cyan-100 bg-cyan-50/60 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">Relationships</p>
              <h2 className="mt-1 text-xl font-black text-sky-950">Canonical people</h2>
              <p className="mt-1 text-sm text-sky-700">Optional links that stay independent from the legacy creator details.</p>
            </div>
            <Link href="/admin/people" className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-black text-sky-800 transition hover:bg-cyan-50">
              Manage people
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-sky-900">
              Creator Person
              <select value={creatorPersonId} onChange={(event) => setCreatorPersonId(event.target.value)} className="rounded-xl border border-sky-200 bg-[#fffdf7] px-3 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100">
                <option value="">None — legacy creator only</option>
                {people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-sky-900">
              Represented Person
              <select value={representedPersonId} onChange={(event) => setRepresentedPersonId(event.target.value)} className="rounded-xl border border-sky-200 bg-[#fffdf7] px-3 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100">
                <option value="">None</option>
                {people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
              </select>
            </label>
          </div>
        </section>

        {error && (
          <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 font-bold text-rose-800">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <Link
            href="/admin/upmans"
            className="rounded-xl border border-sky-200 bg-white px-4 py-2.5 font-black text-sky-800 transition hover:bg-sky-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-sky-500 px-4 py-2.5 font-black text-white transition hover:bg-sky-600 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Uploading and creating…" : "Create Upman"}
          </button>
        </div>
      </form>
    </main>
  );
}
