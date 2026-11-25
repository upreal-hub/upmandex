"use client";
import { useEffect, useState } from "react";

type State = { status: "PRIVATE" | "PUBLIC"; version: number; allowedUsers: number; blockers: string[] };
export default function ReleaseControl() {
  const [state, setState] = useState<State | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const response = await fetch("/api/admin/release", { cache: "no-store" });
    if (!response.ok) throw new Error("Release status unavailable");
    setState(await response.json());
  }
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/release", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Release status unavailable or primary administrator access required.");
      const result = await response.json();
      if (!controller.signal.aborted) setState(result);
    }).catch(() => {
      if (!controller.signal.aborted) setMessage("Release status unavailable or primary administrator access required.");
    });
    return () => controller.abort();
  }, []);
  async function change() {
    if (!state || busy) return;
    const status = state.status === "PRIVATE" ? "PUBLIC" : "PRIVATE";
    const confirmation = status === "PUBLIC" ? "Release UPMANDEX" : "Return to PRIVATE";
    if (window.prompt(`Type ${confirmation} to ${status === "PUBLIC" ? "open the site to everyone immediately" : "restrict access immediately"}.`) !== confirmation) return;
    setBusy(true);
    setState(null);
    try {
      const response = await fetch("/api/admin/release", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, version: state.version, confirmation }) });
      const result = await response.json();
      setMessage(response.ok ? `Publication is now ${result.status}.` : result.error);
      await load();
    } catch { setMessage("Request interrupted. Refresh before trying again."); }
    finally { setBusy(false); }
  }
  async function refresh() {
    setBusy(true);
    try { await load(); setMessage(""); }
    catch { setMessage("Release status unavailable or primary administrator access required."); }
    finally { setBusy(false); }
  }
  return <section className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-5">
    <h2 className="text-xl font-black text-sky-950">Anniversary Release Control</h2>
    {state && <>
      <p className="my-3 font-bold">{state.status} · {state.allowedUsers} authorized users</p>
      <p>{state.blockers.length ? "Launch preparation incomplete" : "Launch prerequisites approved"}</p>
      {state.blockers.map(reason => <p key={reason} className="text-sm text-amber-800">{reason}</p>)}
      <button className="mt-4 rounded-xl bg-sky-800 px-5 py-3 font-bold text-white disabled:opacity-50"
        disabled={busy || (state.status === "PRIVATE" && state.blockers.length > 0)} onClick={() => void change()}>
        {busy ? "Saving…" : state.status === "PRIVATE" ? "Release UPMANDEX" : "Return to PRIVATE"}
      </button>
    </>}
    {!state && message && !busy && <button className="mt-4 rounded-xl border border-sky-800 px-5 py-3 font-bold text-sky-950" onClick={() => void refresh()}>Refresh status</button>}
    <p role="status" className="mt-3 text-sm">{message}</p>
  </section>;
}
