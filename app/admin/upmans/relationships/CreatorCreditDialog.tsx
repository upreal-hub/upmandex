"use client";

import { useState } from "react";
import PersonPicker, { type PersonPickerOption } from "../PersonPicker";

type User = { id: string; displayName: string; twitchLogin: string };
type Upman = {
  slug: string;
  name: string;
  creator: string;
  creatorTwitch: string | null;
  creatorPerson: PersonPickerOption | null;
};
type Operation = "add" | "edit" | "delete";

export default function CreatorCreditDialog({ operation, upman, people, users, onClose, onSaved }: {
  operation: Operation;
  upman: Upman;
  people: PersonPickerOption[];
  users: User[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [mode, setMode] = useState<"person" | "user" | "credit">(upman.creatorPerson ? "person" : "credit");
  const [selection, setSelection] = useState(upman.creatorPerson?.id ?? "");
  const [displayName, setDisplayName] = useState(upman.creator || upman.creatorPerson?.displayName || "");
  const [twitchLogin, setTwitchLogin] = useState(upman.creatorTwitch ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = mode === "person" ? people
    : users.map(user => ({ ...user, user: { twitchLogin: user.twitchLogin } }));
  const selectedLogin = mode === "credit" ? undefined : options.find(person => person.id === selection)?.user?.twitchLogin;

  async function save() {
    if (saving) return;
    if (operation !== "delete" && (!displayName.trim() || (mode !== "credit" && !selection))) {
      setError("Enter a public credit and select a creator if an account or Person is linked.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin-upmans/${encodeURIComponent(upman.slug)}/relationships`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, displayName, twitchLogin: selectedLogin ? "" : twitchLogin,
          personId: mode === "person" ? selection : null, userId: mode === "user" ? selection : null,
          expected: { creator: upman.creator, creatorTwitch: upman.creatorTwitch, creatorPersonId: upman.creatorPerson?.id ?? null } }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) { setError(data.error ?? "Unable to save the creator credit."); return; }
      onSaved(operation === "delete" ? "Creator credit removed." : "Creator credit saved.");
    } catch {
      setError("Unable to save the creator credit.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/30 p-3 backdrop-blur-sm">
    <form onSubmit={event => { event.preventDefault(); void save(); }} role="dialog" aria-modal="true"
      aria-labelledby="creator-credit-title" className="grid max-h-[90dvh] w-full max-w-xl gap-4 overflow-y-auto rounded-[32px] bg-[#fffdf7] p-6 shadow-2xl">
      <h2 id="creator-credit-title" className="text-2xl font-black text-sky-950">{operation === "delete" ? "Delete creator credit" : operation === "edit" ? "Edit creator credit" : "Add creator credit"}</h2>
      <p className="text-sm text-sky-800"><strong>{upman.name}</strong> · Current credit: {upman.creator || upman.creatorPerson?.displayName || "None"}{upman.creatorTwitch ? ` (@${upman.creatorTwitch})` : ""}</p>
      {operation === "delete" ? <p className="text-sm text-rose-800">Remove this creator credit from {upman.name}?</p> : (
        <fieldset disabled={saving} className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-sky-900">Creator source
            <select className="rounded-xl border border-sky-200 bg-white p-2" value={mode} onChange={event => {
              const next = event.target.value as typeof mode;
              setMode(next); setSelection(""); setTwitchLogin("");
            }}>
              <option value="credit">Credit only / no account</option>
              <option value="user">Existing Twitch account</option>
              <option value="person">Existing Person</option>
            </select>
          </label>
          {mode !== "credit" && <PersonPicker label="Creator" people={options} value={selection} noneLabel="Clear selection"
            onChange={selected => {
              setSelection(selected);
              const option = options.find(person => person.id === selected);
              if (option) { setDisplayName(option.displayName); setTwitchLogin(""); }
            }} />}
          <label className="grid gap-2 text-sm font-bold text-sky-900">Public credit name
            <input className="rounded-xl border border-sky-200 bg-white p-2" required maxLength={120}
              value={displayName} onChange={event => setDisplayName(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-sky-900">Twitch login {mode === "user" ? "(from account)" : "(optional)"}
            <input className="rounded-xl border border-sky-200 bg-white p-2" maxLength={26}
              disabled={mode === "user" || !!selectedLogin}
              value={selectedLogin ?? twitchLogin}
              onChange={event => setTwitchLogin(event.target.value)} />
          </label>
        </fieldset>
      )}
      {error && <p role="alert" className="text-sm font-bold text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-sky-200 px-4 py-2 font-bold text-sky-800">Cancel</button>
        <button type="submit" disabled={saving} className={`rounded-xl px-4 py-2 font-bold text-white ${operation === "delete" ? "bg-rose-700" : "bg-sky-600"}`}>
          {saving ? "Saving…" : operation === "delete" ? "Delete credit" : "Save credit"}
        </button>
      </div>
    </form>
  </div>;
}
