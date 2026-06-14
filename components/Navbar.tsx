"use client";

import Link from "next/link";
import LoginButton from "./LoginButton";

export default function Navbar() {
  return (
    <nav className="mb-10">

      <div
        className="
          bg-white/70
          backdrop-blur-md
          rounded-full
          shadow-lg
          px-8
          py-4
          flex
          flex-wrap
          justify-between
          items-center
          gap-6
        "
      >

        <div className="flex flex-wrap items-center gap-8">

          <Link
            href="/"
            className="text-2xl font-black text-sky-700 hover:text-sky-500 transition"
          >
            ☁️ UPMANDEX
          </Link>

          <Link
            href="/"
            className="font-medium text-sky-800 hover:text-sky-500 transition"
          >
            🏠 Home
          </Link>

          <Link
            href="/upmans"
            className="font-medium text-sky-800 hover:text-sky-500 transition"
          >
            📖 Upmans
          </Link>

          <Link
            href="/collections"
            className="font-medium text-sky-800 hover:text-sky-500 transition"
          >
            🎒 Collections
          </Link>

          <Link
  href="/profile"
  className="font-medium text-sky-800 hover:text-sky-500 transition"
>
  🎒 Profile
</Link>

          <Link
            href="/hall-of-fame"
            className="font-medium text-sky-800 hover:text-sky-500 transition"
          >
            👑 Cloud Pantheon
          </Link>

        </div>

        <LoginButton />

      </div>

    </nav>
  );
}