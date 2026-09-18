import Link from "next/link";

import AdminNavigation from "./AdminNavigation";

type AdminShellProps = {
  children: React.ReactNode;
  twitchLogin: string;
};

export default function AdminShell({ children, twitchLogin }: AdminShellProps) {
  return (
    <section className="rounded-[32px] border border-white/80 bg-white/55 p-3 shadow-xl shadow-sky-200/40 backdrop-blur-md sm:p-5">
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-[26px] border border-sky-100 bg-gradient-to-b from-sky-50 via-white to-cyan-50 p-4 lg:sticky lg:top-6 lg:h-fit">
          <div className="mb-5 flex items-center justify-between gap-3 px-2 lg:block">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-500">
                UPMANDEX
              </p>
              <p className="mt-1 text-xl font-black text-sky-950">Admin Cloud</p>
            </div>
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800 lg:mt-3 lg:inline-block">
              Anniversary
            </span>
          </div>

          <AdminNavigation />

          <div className="mt-5 hidden rounded-2xl border border-sky-100 bg-white/80 p-4 lg:block">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-500">
              Signed in as
            </p>
            <p className="mt-1 truncate font-black text-sky-950">{twitchLogin}</p>
            <p className="mt-1 text-xs text-sky-700">Administrator</p>
          </div>

          <Link
            href="/"
            className="mt-5 flex items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-bold text-sky-800 transition hover:bg-sky-50"
          >
            ← Return to UPMANDEX
          </Link>
        </aside>

        <div className="min-w-0 rounded-[26px] border border-white bg-white/70 p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-sky-50 px-4 py-3 lg:hidden">
            <div>
              <p className="text-xs font-bold text-sky-500">Administrator</p>
              <p className="max-w-40 truncate font-black text-sky-950">{twitchLogin}</p>
            </div>
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800">
              Admin
            </span>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}
