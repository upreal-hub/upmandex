import Link from "next/link";

export default function AnniversaryWaiting() {
  return <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
    <p className="text-sm font-bold uppercase tracking-widest text-sky-700">UPMANDEX Anniversary</p>
    <h1 className="text-4xl font-black text-sky-950">Something new is coming.</h1>
    <p className="text-sky-800">
      Join us for the anniversary reveal on{" "}
      <time dateTime="2026-12-05T18:00:00+01:00">Saturday, December 5 at 18:00 CET</time>.
    </p>
    <Link href="/api/auth/signin?callbackUrl=%2F" prefetch={false} className="rounded-full bg-sky-800 px-6 py-3 font-bold text-white">Private access · Sign in with Twitch</Link>
  </main>;
}
