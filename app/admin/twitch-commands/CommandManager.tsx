"use client";

import { useState, type FormEvent } from "react";
import { CommandCard } from "@/app/guides/TwitchCommandsGuide";
import { commandIcons, type Category, type CommandSnapshot, type TwitchCommand } from "@/lib/twitch-command-catalog";

const button = "rounded-lg bg-sky-900 px-3 py-2 font-bold text-white hover:bg-sky-700 disabled:opacity-50";
const input = "block w-full rounded-lg border border-sky-300 bg-white p-2 text-slate-900";
const sorted = <T extends { order: number }>(rows: T[]) => [...rows].sort((a, b) => a.order - b.order);
const blank = (categoryId: string): TwitchCommand => ({
  id: "", categoryId, syntax: "", example: "", description: "", icon: "✨",
  aliases: [], global: 0, viewer: 0, order: 0, visible: true,
});

export default function CommandManager({ initial }: { initial: CommandSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [draft, setDraft] = useState<TwitchCommand | null>(null);
  const [aliases, setAliases] = useState("");
  const [categoryDraft, setCategoryDraft] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const categories = sorted(snapshot.catalog.categories);
  const commands = sorted(snapshot.catalog.commands);
  const parsedAliases = aliases.split(/[\s,]+/).filter(Boolean);

  async function save(action: { type: string; id?: string; value?: unknown }, onSuccess: () => void) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/twitch-commands", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: snapshot.revision, action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSnapshot(result);
      onSuccess();
      setMessage("Catalog updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save the catalog.");
    } finally { setBusy(false); }
  }

  function select(command: TwitchCommand) {
    setDraft(command);
    setAliases(command.aliases.join(", "));
  }

  function submitCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    void save({ type: "saveCommand", id: draft.id || undefined, value: { ...draft, aliases: parsedAliases } }, () => setDraft(null));
  }

  return <main className="space-y-6 text-sky-950">
    <header className="space-y-2">
      <h1 className="text-3xl font-black">Twitch Commands</h1>
      <p>Manage the UPMANDEX guide. Changes here affect the site documentation only.</p>
    </header>
    <p role="status">{message}</p>
    <section className="space-y-3" aria-label="Commands">
      <button className={button} type="button" disabled={busy || !categories.length} onClick={() => select(blank(categories[0]?.id ?? ""))}>New command</button>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{commands.map(command =>
        <button key={command.id} type="button" disabled={busy} onClick={() => select(command)}
          className="rounded-lg border border-sky-200 bg-sky-50 p-2 text-left hover:bg-sky-100" aria-pressed={draft?.id === command.id}>
          <span aria-hidden="true">{command.icon} </span><code>{command.syntax}</code>
          {!command.visible && <small className="ml-2">Hidden</small>}
        </button>)}</div>
    </section>
    {draft && <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4" onSubmit={submitCommand}>
        <h2 className="text-xl font-bold">{draft.id ? "Edit command" : "New command"}</h2>
        <fieldset className="min-w-0 space-y-3" disabled={busy}>
          <label className="block">Syntax<input className={input} maxLength={100} required value={draft.syntax} onChange={e => setDraft({ ...draft, syntax: e.target.value })} /></label>
          <label className="block">Description<input className={input} maxLength={400} required value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
          <label className="block">Example<input className={input} maxLength={160} required value={draft.example} onChange={e => setDraft({ ...draft, example: e.target.value })} /></label>
          <label className="block">Aliases (comma or space separated)<input className={input} value={aliases} onChange={e => setAliases(e.target.value)} maxLength={690} /></label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="min-w-0">Category<select className={input} value={draft.categoryId} onChange={e => setDraft({ ...draft, categoryId: e.target.value })}>
              {categories.map(category => <option key={category.id} value={category.id}>{category.title}</option>)}
            </select></label>
            <label>Icon<select className={input} value={draft.icon} onChange={e => setDraft({ ...draft, icon: e.target.value })}>
              {commandIcons.map(icon => <option key={icon}>{icon}</option>)}
            </select></label>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">{[
            ["global", "Global cooldown (s)", 86400], ["viewer", "Viewer cooldown (s)", 86400], ["order", "Display order", 9999],
          ].map(([key, label, max]) => <label key={key}>{label}<input className={input} required type="number" min={0} max={max}
            value={Number.isNaN(draft[key as "global" | "viewer" | "order"]) ? "" : draft[key as "global" | "viewer" | "order"]}
            onChange={e => setDraft({ ...draft, [key]: e.target.valueAsNumber })} /></label>)}</div>
          <label className="flex gap-2"><input type="checkbox" checked={draft.visible} onChange={e => setDraft({ ...draft, visible: e.target.checked })} />Visible on the site</label>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <button className={button} disabled={busy}>Save command</button>
          <button className={button} disabled={busy} type="button" onClick={() => setDraft(null)}>Cancel</button>
          {draft.id && <button className="rounded-lg border border-red-600 px-3 py-2 font-bold text-red-800" disabled={busy} type="button" onClick={() => {
            if (confirm(`Delete ${draft.syntax} from the guide?`)) void save({ type: "deleteCommand", id: draft.id }, () => setDraft(null));
          }}>Delete command</button>}
        </div>
      </form>
      <div className="min-w-0 space-y-2"><h2 className="text-lg font-bold">Card preview</h2>
        <CommandCard showCopy={false} command={{ ...draft, aliases: parsedAliases }} />
      </div>
    </section>}
    <section className="space-y-3 border-t border-sky-200 pt-4">
      <h2 className="text-xl font-bold">Categories</h2>
      <div className="flex flex-wrap gap-2">
        {categories.map(category => <button type="button" key={category.id} disabled={busy} className={button}
          onClick={() => setCategoryDraft(category)}>{category.title}</button>)}
        <button type="button" disabled={busy} className={button} onClick={() => setCategoryDraft({ id: "", title: "", order: 0 })}>New category</button>
      </div>
      {categoryDraft && <form className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4" onSubmit={event => {
        event.preventDefault();
        void save({ type: "saveCategory", id: categoryDraft.id || undefined, value: categoryDraft }, () => setCategoryDraft(null));
      }}>
        <label className="block">Category name<input className={input} required maxLength={60} value={categoryDraft.title}
          onChange={e => setCategoryDraft({ ...categoryDraft, title: e.target.value })} /></label>
        <label className="block">Category order<input className={input} type="number" required min={0} max={9999}
          value={Number.isNaN(categoryDraft.order) ? "" : categoryDraft.order}
          onChange={e => setCategoryDraft({ ...categoryDraft, order: e.target.valueAsNumber })} /></label>
        <div className="flex flex-wrap gap-2">
          <button className={button} disabled={busy}>Save category</button>
          <button className={button} disabled={busy} type="button" onClick={() => setCategoryDraft(null)}>Cancel</button>
          {categoryDraft.id && <button className="rounded-lg border border-red-600 px-3 py-2 font-bold text-red-800" disabled={busy} type="button" onClick={() => {
            if (confirm(`Delete the category ${categoryDraft.title}?`)) void save({ type: "deleteCategory", id: categoryDraft.id }, () => setCategoryDraft(null));
          }}>Delete category</button>}
        </div>
      </form>}
    </section>
  </main>;
}
