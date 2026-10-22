"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Submission = { id: string; name: string; description: string; image: string; status: "PENDING" | "APPROVED" | "REJECTED"; rarity: string | null; represent: boolean; createdAt: string; approvedUpman: { slug: string; name: string } | null };

export default function SubmitUpmanClient({ displayName, submissions }: { displayName: string | null; submissions: Submission[] }) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setMessage(null);
    const response = await fetch("/api/upman-submissions", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => null);
    setPending(false);
    if (!response.ok) { setMessage(result?.error ?? "Unable to send your proposal"); return; }
    event.currentTarget.reset(); setPreview(null); setMessage("Your Upman is now waiting in the clouds for review."); router.refresh();
  }
  if (!displayName) return <main className="min-h-screen px-5 py-28 text-center"><div className="mx-auto max-w-xl rounded-[2.5rem] border border-sky-200 bg-white/80 p-10 shadow-xl dark:border-sky-900 dark:bg-slate-950/80"><p className="text-sm font-black uppercase tracking-[.2em] text-sky-500">Community creations</p><h1 className="mt-3 text-4xl font-black text-sky-950 dark:text-white">Submit an Upman</h1><p className="mt-4 text-sky-800 dark:text-sky-100">Sign in with Twitch to share an Upman idea with the community.</p><Link href="/" className="mt-7 inline-flex rounded-full bg-sky-500 px-6 py-3 font-black text-white">Back to the clouds</Link></div></main>;
  return <main className="min-h-screen px-5 py-24"><div className="mx-auto max-w-5xl"><header className="mb-10 max-w-2xl"><p className="text-sm font-black uppercase tracking-[.2em] text-sky-500">Community creations</p><h1 className="mt-3 text-4xl font-black text-sky-950 dark:text-white md:text-6xl">Submit an Upman</h1><p className="mt-4 text-lg text-sky-800 dark:text-sky-100">Send your cloud creature for a human review. Your Twitch identity is added automatically, {displayName}.</p></header>
    <section className="rounded-[2.5rem] border border-sky-200 bg-white/85 p-6 shadow-xl shadow-sky-200/30 backdrop-blur dark:border-sky-900 dark:bg-slate-950/85 dark:shadow-none md:p-9"><form onSubmit={submit} className="grid gap-5"><label className="grid gap-2 font-bold text-sky-950 dark:text-white">Upman name<input required name="name" maxLength={120} className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-slate-950 dark:border-sky-800 dark:bg-slate-900 dark:text-white" /></label><label className="grid gap-2 font-bold text-sky-950 dark:text-white">Description<textarea required name="description" maxLength={1000} rows={4} className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-slate-950 dark:border-sky-800 dark:bg-slate-900 dark:text-white" /></label><label className="grid gap-2 font-bold text-sky-950 dark:text-white">PNG illustration <input required name="image" type="file" accept="image/png" onChange={(event) => { const file = event.currentTarget.files?.[0]; setPreview((current) => { if (current?.startsWith("blob:")) URL.revokeObjectURL(current); return file ? URL.createObjectURL(file) : null; }); }} className="rounded-2xl border border-dashed border-sky-300 p-3 text-sm dark:border-sky-700" /></label>{preview && <Image src={preview} alt="Submission preview" width={180} height={180} unoptimized className="h-40 w-40 object-contain" />}<p className="text-sm text-sky-700 dark:text-sky-200">PNG only, up to 4 MiB. You can submit as many original ideas as you like.</p>{message && <p role="status" className="font-bold text-sky-700 dark:text-sky-200">{message}</p>}<button disabled={pending} className="w-fit rounded-full bg-sky-500 px-6 py-3 font-black text-white disabled:opacity-60">{pending ? "Sending…" : "Send for review"}</button></form></section>
    <section className="mt-12"><h2 className="text-2xl font-black text-sky-950 dark:text-white">Your submissions</h2>{submissions.length === 0 ? <p className="mt-4 text-sky-800 dark:text-sky-100">Your first cloud creation can live here.</p> : <div className="mt-5 grid gap-4 md:grid-cols-2">{submissions.map((submission) => <article key={submission.id} className="flex gap-4 rounded-3xl border border-sky-200 bg-white/75 p-4 dark:border-sky-900 dark:bg-slate-950/75"><Image src={submission.image} alt="" width={96} height={96} className="h-24 w-24 shrink-0 object-contain" /><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-sky-950 dark:text-white">{submission.name}</h3><span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-black text-sky-700 dark:bg-sky-900 dark:text-sky-100">{submission.status}</span></div><p className="mt-1 text-sm text-sky-800 dark:text-sky-100">{submission.description}</p>{submission.approvedUpman && <Link className="mt-2 inline-block text-sm font-bold text-sky-600 underline" href={`/upmans/${submission.approvedUpman.slug}`}>View approved Upman ↗</Link>}</div></article>)}</div>}</section>
  </div></main>;
}
