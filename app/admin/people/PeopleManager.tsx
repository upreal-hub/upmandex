"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";

import type { ManagedPerson, PersonUserOption } from "./types";

type PersonEditorProps = {
  person: ManagedPerson | null;
  users: PersonUserOption[];
  onClose: () => void;
};

function PersonEditor({ person, users, onClose }: PersonEditorProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(person?.displayName ?? "");
  const [userId, setUserId] = useState(person?.userId ?? "");
  const [isPublic, setIsPublic] = useState(person?.isPublic ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [, startTransition] = useTransition();

  if (typeof document === "undefined") return null;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(person ? `/api/admin-people/${person.id}` : "/api/admin-people", {
        method: person ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, userId: userId || null, isPublic }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to save this Person.");
        return;
      }

      onClose();
      startTransition(() => router.refresh());
    } catch {
      setError("Unable to save this Person. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/30 p-3 backdrop-blur-sm sm:p-6" onClick={() => !isSaving && onClose()} role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="person-editor-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-xl rounded-[32px] border border-white bg-[#fffdf7] p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600">Person</p>
            <h2 id="person-editor-title" className="mt-1 text-3xl font-black text-sky-950">{person ? "Edit Person" : "Create Person"}</h2>
          </div>
          <button type="button" disabled={isSaving} onClick={onClose} className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-black text-sky-800">Close</button>
        </div>
        <form onSubmit={save} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-sky-900">Display name
            <input required maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-sky-900">Linked User <span className="font-medium text-sky-500">Optional</span>
            <select value={userId} onChange={(event) => setUserId(event.target.value)} className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100">
              <option value="">None</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.displayName} (@{user.twitchLogin})</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-xl bg-sky-50 px-3 py-3 text-sm font-bold text-sky-900">
            <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="h-4 w-4 accent-sky-500" />
            Public Person
          </label>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}
          <div className="mt-2 flex justify-end gap-3">
            <button type="button" disabled={isSaving} onClick={onClose} className="rounded-xl border border-sky-200 bg-white px-4 py-2 font-black text-sky-800">Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-xl bg-sky-500 px-4 py-2 font-black text-white disabled:opacity-60">{isSaving ? "Saving…" : person ? "Save changes" : "Create Person"}</button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  );
}

export default function PeopleManager({ people, users }: { people: ManagedPerson[]; users: PersonUserOption[] }) {
  const [editingPerson, setEditingPerson] = useState<ManagedPerson | null | undefined>(undefined);
  const [syncingPersonId, setSyncingPersonId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  async function syncAchievements(person: ManagedPerson) {
    setSyncMessage(null);
    setSyncingPersonId(person.id);
    try {
      const response = await fetch(`/api/admin-people/${person.id}/achievements`, { method: "POST" });
      const data = (await response.json()) as { success?: boolean; error?: string; progress?: { unlocked: number; available: number } };
      if (!response.ok || !data.success || !data.progress) throw new Error(data.error ?? "Unable to sync achievements.");
      setSyncMessage(`${person.displayName}: ${data.progress.unlocked} / ${data.progress.available} achievements unlocked.`);
      router.refresh();
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Unable to sync achievements.");
    } finally {
      setSyncingPersonId(null);
    }
  }

  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "UNLINKED" | "LINKED" | "CREATORS" | "REPRESENTED">("ALL");
  const visiblePeople = people.filter((person) => `${person.displayName} ${person.user?.twitchLogin ?? ""} ${person.user?.displayName ?? ""}`.toLowerCase().includes(query.toLowerCase()) && (filter === "ALL" || (filter === "UNLINKED" && !person.userId) || (filter === "LINKED" && Boolean(person.userId)) || (filter === "CREATORS" && person.createdUpmansCount > 0) || (filter === "REPRESENTED" && person.representedUpmansCount > 0)));

  return (
    <main>
      <header className="flex flex-col gap-5 border-b border-sky-100 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-600">Anniversary Admin</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-sky-950 sm:text-5xl">People</h1>
          <p className="mt-3 text-sky-700">{people.length} canonical {people.length === 1 ? "Person" : "People"} available for Admin relationships.</p>
        </div>
        <button type="button" onClick={() => setEditingPerson(null)} className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-600">+ Create Person</button>
      </header>
      {syncMessage && <p role="status" className="mt-5 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">{syncMessage}</p>}
      <div className="mt-5 flex flex-wrap gap-2"><input aria-label="Search people" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people..." className="min-w-56 rounded-xl border border-sky-200 px-3 py-2 text-sm" />{(["ALL", "UNLINKED", "LINKED", "CREATORS", "REPRESENTED"] as const).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-xl px-3 py-2 text-xs font-black ${filter === value ? "bg-sky-500 text-white" : "bg-sky-50 text-sky-800"}`}>{value}</button>)}</div>
      <section className="mt-6 overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">
        <div className="hidden grid-cols-[minmax(160px,1fr)_minmax(180px,1fr)_110px_110px_210px] gap-4 border-b border-sky-100 bg-sky-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-sky-600 lg:grid"><span>Person</span><span>Linked User</span><span>Created</span><span>Represented</span><span className="text-right">Actions</span></div>
        {visiblePeople.length ? <div className="divide-y divide-sky-100">{visiblePeople.map((person) => <article key={person.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:grid-cols-[minmax(160px,1fr)_minmax(180px,1fr)_110px_110px_210px] lg:gap-4">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-sky-100 font-black text-sky-700">{person.user?.avatar ? <img src={person.user.avatar} alt="" className="h-full w-full object-cover" /> : "☁"}</span><div><p className="font-black text-sky-950">{person.displayName}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-black ${person.isPublic ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{person.isPublic ? "Public" : "Private"}</span></div></div>
          <p className="text-sm font-semibold text-sky-800">{person.user ? `${person.user.displayName} (@${person.user.twitchLogin})` : "No Twitch linked"} · Achievements: {person.achievementsCount} · {person.hasEquippedTitle ? "Title equipped" : "No title"} · Featured: {person.featuredAchievementsCount}</p>
          <p className="text-sm font-black text-sky-900">Created: {person.createdUpmansCount}</p><p className="text-sm font-black text-sky-900">Represented: {person.representedUpmansCount}</p>
          <div className="flex gap-2 lg:justify-self-end"><button type="button" onClick={() => syncAchievements(person)} disabled={syncingPersonId === person.id} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-black text-cyan-800 transition hover:bg-cyan-100 disabled:opacity-60">{syncingPersonId === person.id ? "Syncing…" : "Sync badges"}</button><button type="button" onClick={() => setEditingPerson(person)} className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-black text-sky-800 transition hover:bg-sky-50">Edit</button></div>
        </article>)}</div> : <div className="px-6 py-14 text-center text-sky-700"><p className="text-xl font-black text-sky-950">{people.length ? "No matching People" : "No People yet"}</p><p className="mt-2">{people.length ? "Try another search or filter." : "Create the first canonical identity when you are ready."}</p></div>}
      </section>
      {editingPerson !== undefined && <PersonEditor key={editingPerson?.id ?? "new"} person={editingPerson} users={users} onClose={() => setEditingPerson(undefined)} />}
    </main>
  );
}
