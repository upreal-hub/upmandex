"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import type { ManagedPerson, PersonUserOption } from "./types";

type AccountAction = "link" | "change" | "unlink";

type PersonEditorProps = {
  person: ManagedPerson | null;
  users: PersonUserOption[];
  onClose: () => void;
};

function UserAvatar({ user }: { user: PersonUserOption }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-sky-100 font-black text-sky-700">
      {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : user.displayName.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

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
      <section role="dialog" aria-modal="true" aria-labelledby="person-editor-title" onClick={(event) => event.stopPropagation()} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-[32px] border border-white bg-[#fffdf7] p-5 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600">Person</p><h2 id="person-editor-title" className="mt-1 text-3xl font-black text-sky-950">{person ? "Edit Person" : "Create Person"}</h2></div><button type="button" disabled={isSaving} onClick={onClose} className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-black text-sky-800">Close</button></div>
        <form onSubmit={save} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-sky-900">Display name<input required maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label>
          <label className="grid gap-2 text-sm font-bold text-sky-900">Linked User <span className="font-medium text-sky-500">Optional</span><select value={userId} onChange={(event) => setUserId(event.target.value)} className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"><option value="">None</option>{users.map((user) => <option key={user.id} value={user.id} disabled={Boolean(user.linkedPerson && user.linkedPerson.id !== person?.id)}>{user.displayName} (@{user.twitchLogin}){user.linkedPerson && user.linkedPerson.id !== person?.id ? ` — linked to ${user.linkedPerson.displayName}` : ""}</option>)}</select></label>
          <label className="flex items-center gap-3 rounded-xl bg-sky-50 px-3 py-3 text-sm font-bold text-sky-900"><input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="h-4 w-4 accent-sky-500" />Public Person</label>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}
          <div className="mt-2 flex justify-end gap-3"><button type="button" disabled={isSaving} onClick={onClose} className="rounded-xl border border-sky-200 bg-white px-4 py-2 font-black text-sky-800">Cancel</button><button type="submit" disabled={isSaving} className="rounded-xl bg-sky-500 px-4 py-2 font-black text-white disabled:opacity-60">{isSaving ? "Saving…" : person ? "Save changes" : "Create Person"}</button></div>
        </form>
      </section>
    </div>,
    document.body
  );
}

function AccountDialog({ person, users, initialAction, onClose, onSuccess }: { person: ManagedPerson; users: PersonUserOption[]; initialAction: AccountAction; onClose: () => void; onSuccess: (message: string) => void }) {
  const [action, setAction] = useState(initialAction);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const filteredUsers = useMemo(() => {
    const value = query.trim().toLowerCase();
    return users.filter((user) => !value || `${user.displayName} ${user.twitchLogin}`.toLowerCase().includes(value));
  }, [query, users]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSaving, onClose]);

  async function submit() {
    if (action !== "unlink" && !selectedUser) {
      setError("Select an available Twitch User first.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin-people/${person.id}/link`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: action === "unlink" ? null : selectedUser?.id }) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to update the linked User.");
        return;
      }
      const message = action === "link" ? "Twitch User linked." : action === "change" ? "Linked Twitch User changed." : "Twitch User unlinked.";
      onSuccess(message);
      startTransition(() => router.refresh());
    } catch {
      setError("Unable to update the linked User. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (typeof document === "undefined") return null;
  const isUnlink = action === "unlink";
  const title = isUnlink ? "Unlink Twitch/User" : action === "change" ? "Change Twitch/User" : "Link Twitch/User";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/30 p-3 backdrop-blur-sm sm:p-6" role="presentation" onClick={() => !isSaving && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="person-account-title" onClick={(event) => event.stopPropagation()} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-white bg-[#fffdf7] p-5 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600">Person account</p><h2 id="person-account-title" className="mt-1 text-3xl font-black text-sky-950">{title}</h2><p className="mt-2 text-sm text-sky-700">Person: <strong>{person.displayName}</strong></p></div><button type="button" disabled={isSaving} onClick={onClose} className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-black text-sky-800">Close</button></div>
        {person.user && <section className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-sky-500">Current</p><div className="mt-2 flex items-center gap-3"><UserAvatar user={person.user} /><p className="font-black text-sky-950">{person.user.displayName} <span className="font-semibold text-sky-600">(@{person.user.twitchLogin})</span></p></div></section>}
        {person.user && !isUnlink && <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => { setAction("change"); setError(null); }} className={`rounded-xl px-3 py-2 text-sm font-black ${action === "change" ? "bg-sky-500 text-white" : "border border-sky-200 bg-white text-sky-800"}`}>Change User</button><button type="button" onClick={() => { setAction("unlink"); setError(null); }} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-black text-rose-700">Unlink User</button></div>}
        {isUnlink ? <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-black">This removes the authenticated ownership/Twitch identity from this Person.</p><ul className="mt-2 list-disc space-y-1 pl-5"><li>The Person remains.</li><li>The User and its Inventory remain unchanged.</li><li>Created and represented Upman relationships remain unchanged.</li></ul></section> : <><p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{action === "change" ? "Changing the linked User changes which authenticated account controls this Person. Inventory stays with each User and is never moved." : "Choose an existing Twitch User to link. No User or Twitch identity will be created."}</p><div className="mt-5 grid gap-3"><label className="grid gap-2 text-sm font-bold text-sky-900">Find an existing Twitch User<input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Twitch login or display name" className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label><div className="max-h-64 overflow-y-auto rounded-2xl border border-sky-100 bg-white">{filteredUsers.map((user) => { const occupied = Boolean(user.linkedPerson && user.linkedPerson.id !== person.id); const current = user.id === person.userId; return <button type="button" key={user.id} disabled={occupied || current} onClick={() => { setSelectedUserId(user.id); setError(null); }} className={`flex w-full items-center gap-3 border-b border-sky-50 px-3 py-3 text-left text-sm last:border-b-0 ${selectedUserId === user.id ? "bg-cyan-50" : "hover:bg-sky-50"} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60`}><UserAvatar user={user} /><span className="min-w-0 flex-1"><strong className="block truncate text-sky-950">{user.displayName}</strong><span className="block truncate text-sky-600">@{user.twitchLogin}</span></span><span className={`rounded-full px-2 py-1 text-xs font-black ${occupied ? "bg-slate-200 text-slate-700" : current ? "bg-cyan-100 text-cyan-800" : "bg-emerald-100 text-emerald-800"}`}>{occupied ? `Linked to ${user.linkedPerson?.displayName}` : current ? "Current" : "Available"}</span></button>; })}{filteredUsers.length === 0 && <p className="px-4 py-8 text-center text-sm text-sky-700">No Users match this search.</p>}</div></div>{selectedUser && <section className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-sky-900"><p className="text-xs font-black uppercase tracking-wide text-cyan-700">New</p><p className="mt-1 font-black">{selectedUser.displayName} <span className="font-semibold">(@{selectedUser.twitchLogin})</span></p><p className="mt-3">{action === "link" ? "Link this existing User to the Person above." : "Replace the current linked User with this existing User."}</p></section>}</>}
        {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" disabled={isSaving} onClick={onClose} className="rounded-xl border border-sky-200 bg-white px-4 py-2 font-black text-sky-800">Cancel</button><button type="button" disabled={isSaving || (!isUnlink && !selectedUser)} onClick={submit} className={`rounded-xl px-4 py-2 font-black text-white disabled:opacity-60 ${isUnlink ? "bg-rose-600 hover:bg-rose-700" : "bg-sky-500 hover:bg-sky-600"}`}>{isSaving ? "Saving…" : isUnlink ? "Unlink User" : action === "change" ? "Change User" : "Link User"}</button></div>
      </section>
    </div>,
    document.body
  );
}

export default function PeopleManager({ people, users }: { people: ManagedPerson[]; users: PersonUserOption[] }) {
  const router = useRouter();
  const [editingPerson, setEditingPerson] = useState<ManagedPerson | null | undefined>(undefined);
  const [accountPerson, setAccountPerson] = useState<ManagedPerson | null>(null);
  const [syncingPersonId, setSyncingPersonId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "UNLINKED" | "LINKED" | "CREATORS" | "REPRESENTED">("ALL");
  const visiblePeople = people.filter((person) => {
    const searchable = `${person.displayName} ${person.user?.twitchLogin ?? ""} ${person.user?.displayName ?? ""}`.toLowerCase();
    const matchesFilter = filter === "ALL" || (filter === "UNLINKED" && !person.userId) || (filter === "LINKED" && Boolean(person.userId)) || (filter === "CREATORS" && person.createdUpmansCount > 0) || (filter === "REPRESENTED" && person.representedUpmansCount > 0);
    return searchable.includes(query.toLowerCase()) && matchesFilter;
  });

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

  return <main><header className="flex flex-col gap-5 border-b border-sky-100 pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-600">Anniversary Admin</p><h1 className="mt-2 text-4xl font-black tracking-tight text-sky-950 sm:text-5xl">People</h1><p className="mt-3 text-sky-700">{people.length} canonical {people.length === 1 ? "Person" : "People"} available for Admin relationships.</p></div><button type="button" onClick={() => setEditingPerson(null)} className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-600">+ Create Person</button></header>{syncMessage && <p role="status" className="mt-5 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">{syncMessage}</p>}<div className="mt-5 flex flex-wrap gap-2"><input aria-label="Search people" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people..." className="min-w-56 rounded-xl border border-sky-200 px-3 py-2 text-sm" />{(["ALL", "UNLINKED", "LINKED", "CREATORS", "REPRESENTED"] as const).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-xl px-3 py-2 text-xs font-black ${filter === value ? "bg-sky-500 text-white" : "bg-sky-50 text-sky-800"}`}>{value}</button>)}</div><section className="mt-6 overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm"><div className="hidden grid-cols-[minmax(160px,1fr)_minmax(180px,1fr)_110px_110px_300px] gap-4 border-b border-sky-100 bg-sky-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-sky-600 lg:grid"><span>Person</span><span>Linked User</span><span>Created</span><span>Represented</span><span className="text-right">Actions</span></div>{visiblePeople.length ? <div className="divide-y divide-sky-100">{visiblePeople.map((person) => <article key={person.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:grid-cols-[minmax(160px,1fr)_minmax(180px,1fr)_110px_110px_300px] lg:gap-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-sky-100 font-black text-sky-700">{person.user?.avatar ? <img src={person.user.avatar} alt="" className="h-full w-full object-cover" /> : "☁"}</span><div><p className="font-black text-sky-950">{person.displayName}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-black ${person.isPublic ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{person.isPublic ? "Public" : "Private"}</span></div></div><p className="text-sm font-semibold text-sky-800">{person.user ? `${person.user.displayName} (@${person.user.twitchLogin})` : "No Twitch linked"} · Achievements: {person.achievementsCount} · {person.hasEquippedTitle ? "Title equipped" : "No title"} · Featured: {person.featuredAchievementsCount}</p><p className="text-sm font-black text-sky-900">Created: {person.createdUpmansCount}</p><p className="text-sm font-black text-sky-900">Represented: {person.representedUpmansCount}</p><div className="flex flex-wrap gap-2 lg:justify-self-end"><button type="button" onClick={() => setAccountPerson(person)} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-black text-cyan-800 transition hover:bg-cyan-100">{person.user ? "Manage account" : "Link User"}</button><button type="button" onClick={() => syncAchievements(person)} disabled={syncingPersonId === person.id} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-black text-cyan-800 transition hover:bg-cyan-100 disabled:opacity-60">{syncingPersonId === person.id ? "Syncing…" : "Sync badges"}</button><button type="button" onClick={() => setEditingPerson(person)} className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-black text-sky-800 transition hover:bg-sky-50">Edit</button></div></article>)}</div> : <div className="px-6 py-14 text-center text-sky-700"><p className="text-xl font-black text-sky-950">{people.length ? "No matching People" : "No People yet"}</p><p className="mt-2">{people.length ? "Try another search or filter." : "Create the first canonical identity when you are ready."}</p></div>}</section>{editingPerson !== undefined && <PersonEditor key={editingPerson?.id ?? "new"} person={editingPerson} users={users} onClose={() => setEditingPerson(undefined)} />}{accountPerson && <AccountDialog key={accountPerson.id} person={accountPerson} users={users} initialAction={accountPerson.user ? "change" : "link"} onClose={() => setAccountPerson(null)} onSuccess={(message) => { setAccountPerson(null); setSyncMessage(`${accountPerson.displayName}: ${message}`); }} />}</main>;
}
