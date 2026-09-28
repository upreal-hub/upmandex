"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type AssetType = "BACKGROUND" | "BANNER";
type Asset = { id: string; type: AssetType; name: string; image: string; createdAt: string; updatedAt: string };

const LABELS: Record<AssetType, { heading: string; hint: string }> = {
  BACKGROUND: { heading: "Backgrounds", hint: "PNG, JPEG, or WebP · up to 5 MiB · up to 4096 × 4096" },
  BANNER: { heading: "Banners", hint: "PNG, JPEG, or WebP · up to 5 MiB · up to 4096 × 2048 · 4:1–5:1 works best" },
};

export default function ProfileCosmeticsManager({ initialAssets }: { initialAssets: Asset[] }) {
  const [assets, setAssets] = useState(initialAssets);
  const [uploadType, setUploadType] = useState<AssetType | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateAsset(asset: Asset) { setAssets((items) => items.map((item) => item.id === asset.id ? asset : item)); }
  function removeAsset(id: string) { setAssets((items) => items.filter((item) => item.id !== id)); }
  function report(message: string | null, failed = false) { setError(failed ? message : null); setNotice(failed ? null : message); }

  return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Anniversary Admin</p><h1 className="mt-2 text-4xl font-black tracking-tight text-sky-950 sm:text-5xl">Profile Cosmetics</h1><p className="mt-3 max-w-2xl text-sky-700">A shared catalog of custom profile backgrounds and banners. People will be able to select these in a later phase.</p></div>
    </header>
    {notice && <p role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-bold text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 font-bold text-rose-800">{error}</p>}
    <div className="mt-8 space-y-10">{(["BACKGROUND", "BANNER"] as const).map((type) => <section key={type} aria-labelledby={`${type}-heading`} className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Profile cosmetic</p><h2 id={`${type}-heading`} className="mt-1 text-2xl font-black text-sky-950">{LABELS[type].heading}</h2><p className="mt-1 text-sm text-sky-700">{LABELS[type].hint}</p></div><button type="button" onClick={() => { setUploadType(type); report(null); }} className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-sky-600">+ Upload {type === "BACKGROUND" ? "background" : "banner"}</button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{assets.filter((asset) => asset.type === type).map((asset) => <AssetCard key={asset.id} asset={asset} onUpdate={updateAsset} onDelete={removeAsset} onReport={report} />)}{!assets.some((asset) => asset.type === type) && <p className="col-span-full rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 px-5 py-10 text-center font-bold text-sky-700">No {LABELS[type].heading.toLowerCase()} yet.</p>}</div>
    </section>)}</div>
    {uploadType && <UploadDialog type={uploadType} onClose={() => setUploadType(null)} onCreated={(asset) => { setAssets((items) => [...items, asset]); setUploadType(null); report(`${asset.name} is ready.`); }} onReport={report} />}
  </main>;
}

function AssetCard({ asset, onUpdate, onDelete, onReport }: { asset: Asset; onUpdate: (asset: Asset) => void; onDelete: (id: string) => void; onReport: (message: string | null, failed?: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false);
  async function rename() { const name = window.prompt("New cosmetic name", asset.name); if (name === null) return; setBusy(true); const form = new FormData(); form.set("action", "rename"); form.set("name", name); const response = await fetch(`/api/admin/profile-cosmetics/${asset.id}`, { method: "PATCH", body: form }); const body = await response.json(); setBusy(false); if (!response.ok) return onReport(body.error ?? "Unable to rename cosmetic", true); onUpdate({ ...body.asset, createdAt: body.asset.createdAt, updatedAt: body.asset.updatedAt }); onReport("Cosmetic renamed."); }
  async function replace(file?: File) { if (!file) return; setBusy(true); const form = new FormData(); form.set("action", "replace"); form.set("image", file); const response = await fetch(`/api/admin/profile-cosmetics/${asset.id}`, { method: "PATCH", body: form }); const body = await response.json(); setBusy(false); if (!response.ok) return onReport(body.error ?? "Unable to replace image", true); onUpdate({ ...body.asset, createdAt: body.asset.createdAt, updatedAt: body.asset.updatedAt }); onReport(body.cleanupWarning ? "Image replaced; old Blob cleanup needs attention." : "Image replaced."); }
  async function remove() { if (!window.confirm(`Delete "${asset.name}"? Profiles using it will fall back from this custom asset.`)) return; setBusy(true); const response = await fetch(`/api/admin/profile-cosmetics/${asset.id}`, { method: "DELETE" }); const body = await response.json(); setBusy(false); if (!response.ok) return onReport(body.error ?? "Unable to delete cosmetic", true); onDelete(asset.id); onReport(body.cleanupWarning ? "Cosmetic deleted; Blob cleanup needs attention." : "Cosmetic deleted."); }
  return <article className="overflow-hidden rounded-2xl border border-sky-100 bg-[#fffdf7]"><div className={`relative overflow-hidden bg-sky-50 ${asset.type === "BANNER" ? "aspect-[4/1]" : "aspect-[16/9]"}`}><Image src={asset.image} alt={`${asset.name} ${asset.type.toLowerCase()} preview`} fill sizes="(max-width: 640px) 92vw, (max-width: 1024px) 44vw, 28vw" className="object-cover" /></div><div className="p-4"><p className="text-xs font-black uppercase tracking-[0.15em] text-cyan-700">{asset.type === "BACKGROUND" ? "Background" : "Banner"}</p><h3 className="mt-1 break-words text-lg font-black text-sky-950">{asset.name}</h3><div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} onClick={rename} className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-800">Rename</button><button disabled={busy} onClick={() => input.current?.click()} className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-800">Replace image</button><button disabled={busy} onClick={remove} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">Delete</button></div><input ref={input} type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" className="sr-only" onChange={(event) => { void replace(event.target.files?.[0]); event.currentTarget.value = ""; }} /></div></article>;
}

function UploadDialog({ type, onClose, onCreated, onReport }: { type: AssetType; onClose: () => void; onCreated: (asset: Asset) => void; onReport: (message: string | null, failed?: boolean) => void }) {
  const [name, setName] = useState(""); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); if (!file) return onReport("Choose an image first.", true); setBusy(true); const form = new FormData(); form.set("type", type); form.set("name", name); form.set("image", file); const response = await fetch("/api/admin/profile-cosmetics", { method: "POST", body: form }); const body = await response.json(); setBusy(false); if (!response.ok) return onReport(body.error ?? "Unable to upload cosmetic", true); onCreated({ ...body.asset, createdAt: body.asset.createdAt, updatedAt: body.asset.updatedAt }); }
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-sky-950/35 p-4" role="presentation"><form onSubmit={submit} className="w-full max-w-lg rounded-3xl border border-sky-100 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="upload-cosmetic-title"><h2 id="upload-cosmetic-title" className="text-2xl font-black text-sky-950">Upload {type === "BACKGROUND" ? "background" : "banner"}</h2><p className="mt-2 text-sm text-sky-700">{LABELS[type].hint}</p><label className="mt-5 grid gap-2 text-sm font-bold text-sky-900">Name<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="rounded-xl border border-sky-200 bg-[#fffdf7] px-3 py-2.5 text-slate-800" /></label><label className="mt-4 grid gap-2 text-sm font-bold text-sky-900">Image<input required type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="rounded-xl border border-sky-200 bg-[#fffdf7] px-3 py-2.5 text-slate-800" /></label>{file && <p className="mt-2 text-xs font-bold text-sky-600">{file.name} · {Math.ceil(file.size / 1024)} KiB</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-sky-200 bg-white px-4 py-2.5 font-black text-sky-800">Cancel</button><button disabled={busy} type="submit" className="rounded-xl bg-sky-500 px-4 py-2.5 font-black text-white disabled:opacity-60">{busy ? "Uploading…" : "Upload"}</button></div></form></div>;
}
