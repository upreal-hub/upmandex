"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { ADMIN_RARITY_CLASSES } from "../../rarity";

type Person = { id: string; displayName: string; userId: string | null; user: { twitchLogin: string } | null };
type User = { id: string; twitchLogin: string; displayName: string; avatar: string | null; person: { id: string; displayName: string } | null };
type Upman = {
  id: string; slug: string; name: string; image: string; rarity: string; creator: string; creatorTwitch: string | null;
  creatorPerson: { id: string; displayName: string } | null;
  representedPerson: { id: string; displayName: string } | null;
};
type Relation = "creator" | "represented";
type Status = "All" | "Needs attention" | "Complete" | "Missing represented viewer" | "Missing creator";

const rarities = ["All", "Common", "Rare", "Epic", "Mythic", "Legendary"];
const statuses: Status[] = ["All", "Needs attention", "Complete", "Missing represented viewer", "Missing creator"];

function needsViewer(upman: Upman) {
  return upman.rarity !== "Common" && !upman.representedPerson;
}

function needsAttention(upman: Upman) {
  return !upman.creatorPerson || needsViewer(upman) || (upman.rarity === "Common" && Boolean(upman.representedPerson));
}

function matchesStatus(upman: Upman, status: Status) {
  if (status === "All") return true;
  if (status === "Needs attention") return needsAttention(upman);
  if (status === "Complete") return !needsAttention(upman);
  if (status === "Missing represented viewer") return needsViewer(upman);
  return !upman.creatorPerson;
}

function RelationshipModal({ upman, people, users, onClose }: { upman: Upman; people: Person[]; users: User[]; onClose: () => void }) {
  const router = useRouter();
  const [relation, setRelation] = useState<Relation>("represented");
  const [mode, setMode] = useState<"existing" | "user" | "new">("existing");
  const [personId, setPersonId] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [, startTransition] = useTransition();
  const isCommon = upman.rarity === "Common";
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const filteredUsers = users.filter((user) => {
    const query = userQuery.trim().toLowerCase();
    return !query || user.twitchLogin.includes(query) || user.displayName.toLowerCase().includes(query);
  }).slice(0, 8);

  function chooseUser(user: User) {
    setSelectedUserId(user.id);
    setDisplayName(user.displayName);
    setError(null);
  }

  async function save() {
    setError(null);
    const body = relation === "creator" && mode === "existing"
      ? { relation, source: personId ? "existing-person" : "unlink", ...(personId ? { personId } : {}) }
      : relation === "represented" && mode === "existing"
        ? { relation, source: personId ? "existing-person" : "unlink", ...(personId ? { personId } : {}) }
        : mode === "user"
          ? { relation, source: "create-person", displayName, userId: selectedUserId || null }
          : { relation, source: "create-person", displayName, userId: null };

    if ((mode === "user" && !selectedUserId) || (mode === "new" && !displayName.trim())) {
      setError(mode === "user" ? "Select a Twitch User first." : "Enter a Person display name.");
      return;
    }
    if (relation === "represented" && isCommon && body.source !== "unlink") {
      setError("Common Upmans cannot represent a Person.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin-upmans/${upman.slug}/relationships`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) { setError(data.error ?? "Unable to save this relationship."); return; }
      onClose();
      startTransition(() => router.refresh());
    } catch {
      setError("Unable to save this relationship. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/30 p-3 backdrop-blur-sm sm:p-6" role="presentation" onClick={() => !isSaving && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="relationship-title" onClick={(event) => event.stopPropagation()} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-white bg-[#fffdf7] p-5 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600">Upman relationships</p><h2 id="relationship-title" className="mt-1 text-3xl font-black text-sky-950">{upman.name}</h2><p className="mt-1 text-sm text-sky-700">{upman.rarity} · legacy creator: {upman.creator}</p></div><button type="button" disabled={isSaving} onClick={onClose} className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-black text-sky-800">Close</button></div>

        <div className="mt-6 flex gap-2 rounded-2xl bg-sky-50 p-1" role="tablist" aria-label="Relationship type">
          <button type="button" role="tab" aria-selected={relation === "represented"} onClick={() => { setRelation("represented"); setMode("existing"); setError(null); }} className={`flex-1 rounded-xl px-3 py-2 text-sm font-black ${relation === "represented" ? "bg-white text-sky-950 shadow-sm" : "text-sky-700"}`}>Represented viewer</button>
          <button type="button" role="tab" aria-selected={relation === "creator"} onClick={() => { setRelation("creator"); setMode("existing"); setError(null); }} className={`flex-1 rounded-xl px-3 py-2 text-sm font-black ${relation === "creator" ? "bg-white text-sky-950 shadow-sm" : "text-sky-700"}`}>Creator</button>
        </div>

        {relation === "represented" && isCommon ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">Not applicable — Common Upmans are generic concepts and cannot represent a viewer.</div> : <>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => setMode("existing")} className={`rounded-xl px-3 py-2 text-sm font-black ${mode === "existing" ? "bg-sky-500 text-white" : "border border-sky-200 bg-white text-sky-800"}`}>Select Person</button>
            {relation === "represented" && <button type="button" onClick={() => setMode("user")} className={`rounded-xl px-3 py-2 text-sm font-black ${mode === "user" ? "bg-sky-500 text-white" : "border border-sky-200 bg-white text-sky-800"}`}>Select Twitch User</button>}
            <button type="button" onClick={() => setMode("new")} className={`rounded-xl px-3 py-2 text-sm font-black ${mode === "new" ? "bg-sky-500 text-white" : "border border-sky-200 bg-white text-sky-800"}`}>Create Person only</button>
          </div>
          {mode === "existing" && <label className="mt-5 grid gap-2 text-sm font-bold text-sky-900">{relation === "creator" ? "Structured Creator" : "Represented Person"}<select value={personId} onChange={(event) => setPersonId(event.target.value)} className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"><option value="">None / unlink</option>{people.map((person) => <option key={person.id} value={person.id}>{person.displayName}{person.user ? ` (@${person.user.twitchLogin})` : ""}</option>)}</select></label>}
          {mode === "user" && <div className="mt-5 grid gap-3"><label className="grid gap-2 text-sm font-bold text-sky-900">Search Twitch Users<input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="Login or display name" className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label><div className="max-h-44 overflow-y-auto rounded-2xl border border-sky-100 bg-white">{filteredUsers.map((user) => <button type="button" key={user.id} onClick={() => chooseUser(user)} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-sky-50 ${selectedUserId === user.id ? "bg-sky-50" : ""}`}>{user.avatar ? <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-sky-100 font-black text-sky-700">{user.displayName.slice(0, 1).toUpperCase()}</span>}<span><strong className="block text-sky-950">{user.displayName}</strong><span className="text-sky-600">@{user.twitchLogin}</span></span></button>)}</div>{selectedUser && <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-sky-900"><p className="font-black">Selected: {selectedUser.displayName} (@{selectedUser.twitchLogin})</p>{selectedUser.person ? <p className="mt-1">Existing Person: <strong>{selectedUser.person.displayName}</strong>. Saving reuses it.</p> : <label className="mt-3 grid gap-2 font-bold">Person display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-slate-800 outline-none focus:border-sky-500" /></label>}</div>}</div>}
          {mode === "new" && <label className="mt-5 grid gap-2 text-sm font-bold text-sky-900">Person display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} placeholder="Reviewed canonical name" className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /><span className="text-xs font-medium text-sky-600">No User will be created or inferred. A User can be linked later.</span></label>}
        </>}
        {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={isSaving} onClick={onClose} className="rounded-xl border border-sky-200 bg-white px-4 py-2 font-black text-sky-800">Cancel</button>{!(relation === "represented" && isCommon) && <button type="button" disabled={isSaving} onClick={save} className="rounded-xl bg-sky-500 px-4 py-2 font-black text-white disabled:opacity-60">{isSaving ? "Saving…" : "Save relationship"}</button>}</div>
      </section>
    </div>, document.body);
}

export default function RelationshipManager({ upmans, people, users }: { upmans: Upman[]; people: Person[]; users: User[] }) {
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("All");
  const [status, setStatus] = useState<Status>("Needs attention");
  const [editing, setEditing] = useState<Upman | null>(null);
  const visible = useMemo(() => upmans.filter((upman) => {
    const value = query.trim().toLowerCase();
    const text = [upman.name, upman.creator, upman.creatorTwitch ?? "", upman.creatorPerson?.displayName ?? "", upman.representedPerson?.displayName ?? ""].join(" ").toLowerCase();
    return (!value || text.includes(value)) && (rarity === "All" || upman.rarity === rarity) && matchesStatus(upman, status);
  }), [upmans, query, rarity, status]);
  const rarePlus = upmans.filter((upman) => upman.rarity !== "Common");
  const viewerLinked = rarePlus.filter((upman) => upman.representedPerson).length;
  const creatorLinked = upmans.filter((upman) => upman.creatorPerson).length;

  return <main>
    <header className="flex flex-col gap-5 border-b border-sky-100 pb-7 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-600">Anniversary Admin</p><h1 className="mt-2 text-4xl font-black tracking-tight text-sky-950 sm:text-5xl">Upman Relationships</h1><p className="mt-3 text-sky-700">Explicitly connect canonical creators and represented viewers. Nothing is matched automatically.</p></div></header>
    <section className="mt-6 grid gap-3 sm:grid-cols-3"><article className="rounded-3xl border border-sky-100 bg-white p-4"><p className="text-sm font-bold text-sky-600">Represented viewers</p><p className="mt-2 text-2xl font-black text-sky-950">{viewerLinked} / {rarePlus.length}</p><p className="mt-1 text-xs text-sky-700">Rare+ only; Commons excluded.</p></article><article className="rounded-3xl border border-sky-100 bg-white p-4"><p className="text-sm font-bold text-sky-600">Structured creators</p><p className="mt-2 text-2xl font-black text-sky-950">{creatorLinked} / {upmans.length}</p><p className="mt-1 text-xs text-sky-700">Independent from viewers.</p></article><article className="rounded-3xl border border-amber-100 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-800">Needs attention</p><p className="mt-2 text-2xl font-black text-amber-950">{upmans.filter(needsAttention).length}</p><p className="mt-1 text-xs text-amber-800">Missing required links or invalid Common state.</p></article></section>
    <section className="mt-6 grid gap-3 rounded-3xl border border-sky-100 bg-sky-50/70 p-4 lg:grid-cols-[minmax(0,1fr)_180px_220px]"><label className="grid gap-2 text-sm font-bold text-sky-900">Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Upman, legacy creator, Person, or Twitch login" className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label><label className="grid gap-2 text-sm font-bold text-sky-900">Rarity<select value={rarity} onChange={(event) => setRarity(event.target.value)} className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-sky-500">{rarities.map((value) => <option key={value}>{value}</option>)}</select></label><label className="grid gap-2 text-sm font-bold text-sky-900">Status<select value={status} onChange={(event) => setStatus(event.target.value as Status)} className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-sky-500">{statuses.map((value) => <option key={value}>{value}</option>)}</select></label></section>
    <p className="mt-4 text-sm font-bold text-sky-700">{visible.length} {visible.length === 1 ? "Upman" : "Upmans"} shown</p>
    <section className="mt-4 overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">{visible.map((upman) => <article key={upman.id} className="grid gap-3 border-b border-sky-100 px-4 py-4 last:border-b-0 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center lg:grid-cols-[56px_minmax(160px,0.8fr)_minmax(170px,1fr)_minmax(170px,1fr)_130px] lg:gap-4"><div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-sky-100 bg-sky-50 p-1"><Image src={upman.image} alt="" width={56} height={56} className="h-full w-full object-contain" /></div><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sky-950">{upman.name}</strong><span className={`rounded-full px-2 py-0.5 text-xs font-black ${ADMIN_RARITY_CLASSES[upman.rarity] ?? "bg-sky-100 text-sky-700"}`}>{upman.rarity}</span></div><p className="mt-1 text-xs text-sky-600">Legacy: {upman.creator}{upman.creatorTwitch ? ` · @${upman.creatorTwitch}` : ""}</p></div><p className="text-sm text-sky-800"><span className="font-black">Creator:</span> {upman.creatorPerson?.displayName ?? "⚠ Missing"}</p><p className="text-sm text-sky-800"><span className="font-black">Viewer:</span> {upman.rarity === "Common" ? "Not applicable — Common" : upman.representedPerson ? `✓ ${upman.representedPerson.displayName}` : "⚠ Missing represented viewer"}</p><button type="button" onClick={() => setEditing(upman)} className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-black text-sky-800 transition hover:bg-sky-50">Manage</button></article>)}{visible.length === 0 && <p className="px-6 py-14 text-center text-sky-700">No Upmans match these filters.</p>}</section>
    {editing && <RelationshipModal key={editing.id} upman={editing} people={people} users={users} onClose={() => setEditing(null)} />}
  </main>;
}
