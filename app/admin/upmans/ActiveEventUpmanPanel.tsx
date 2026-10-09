"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ActiveEventUpmanConfig, EventUpmanOption } from "./types";

type ApiResponse = {
  success?: boolean;
  error?: string;
  config?: ActiveEventUpmanConfig;
};

export default function ActiveEventUpmanPanel({
  eventUpmans,
  initialConfig,
}: {
  eventUpmans: EventUpmanOption[];
  initialConfig: ActiveEventUpmanConfig | null;
}) {
  const router = useRouter();
  const [selectedUpmanId, setSelectedUpmanId] = useState(initialConfig?.selectedUpmanId ?? "");
  const [rewardId, setRewardId] = useState(initialConfig?.rewardId ?? "");
  const [config, setConfig] = useState(initialConfig);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedUpman = eventUpmans.find((upman) => upman.id === selectedUpmanId) ?? null;
  const canSave = Boolean(config) && (!selectedUpman || rewardId.trim().length > 0);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/event-upman", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upmanId: selectedUpmanId || null, rewardId }),
      });
      const body = (await response.json()) as ApiResponse;
      if (!response.ok || !body.config) {
        setError(body.error ?? "Unable to save Event Upman configuration.");
        return;
      }

      setConfig(body.config);
      setSelectedUpmanId(body.config.selectedUpmanId ?? "");
      setRewardId(body.config.rewardId);
      setNotice(body.config.isActive ? "Event Upman is active for Twitch redemptions." : "Event rewards are disabled.");
      router.refresh();
    } catch {
      setError("Unable to save Event Upman configuration. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-fuchsia-100 bg-gradient-to-br from-white to-fuchsia-50/70 p-5 shadow-sm" aria-labelledby="active-event-upman-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-600">Stream events</p>
          <h2 id="active-event-upman-title" className="mt-1 text-2xl font-black text-sky-950">Active Event Upman</h2>
          <p className="mt-2 max-w-2xl text-sm text-sky-700">Choose the exact Event Upman awarded by the manually enabled Twitch reward. Pulls never use Event rarity Upmans.</p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${config?.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
          {config?.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {!config ? (
        <p role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">The Anniversary event record is not available, so Twitch event rewards cannot be configured.</p>
      ) : eventUpmans.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">Create an Upman with rarity Event before configuring a Twitch event reward.</p>
      ) : (
        <form onSubmit={save} className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <label className="grid gap-2 text-sm font-bold text-sky-900">
            Event Upman
            <select value={selectedUpmanId} onChange={(event) => setSelectedUpmanId(event.target.value)} disabled={isSaving} className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100 disabled:opacity-60">
              <option value="">No event active</option>
              {eventUpmans.map((upman) => <option key={upman.id} value={upman.id}>{upman.name} (/{upman.slug})</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-sky-900">
            Twitch Reward ID
            <input value={rewardId} onChange={(event) => setRewardId(event.target.value)} disabled={isSaving || !selectedUpmanId} placeholder="Reward UUID from Twitch" spellCheck="false" className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 font-mono text-sm text-slate-800 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500" />
          </label>
          <button type="submit" disabled={!canSave || isSaving} className="rounded-xl bg-fuchsia-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? "Saving…" : "Save"}
          </button>
        </form>
      )}

      {config && <p className="mt-4 text-sm text-sky-700">{config.isActive ? <><strong className="text-sky-950">Currently awarding:</strong> {config.selectedUpmanName}</> : config.selectedUpmanName ? <><strong className="text-sky-950">Inactive configuration:</strong> {config.selectedUpmanName} is retained but unavailable.</> : <>No Event Upman is currently configured.</>}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">{error}</p>}
    </section>
  );
}
