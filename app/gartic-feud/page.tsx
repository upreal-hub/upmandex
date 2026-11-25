import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gartic Feud | UPMANDEX Anniversary",
  description: "A Gartic-themed game show on the UPMANDEX Anniversary Twitch stream.",
};

export default function GarticFeudPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="mb-3 text-sm font-bold uppercase tracking-widest">
        UPMANDEX Anniversary
      </p>
      <h1 className="text-4xl font-black sm:text-5xl">Gartic Feud</h1>
      <p className="mt-4 text-lg font-semibold">
        <time dateTime="2026-12-05T22:00:00+01:00">
          Saturday, December 5 at 22:00 CET
        </time>
      </p>
      <p className="mt-6">
        Four streamers compete to guess the most popular answers to Gartic-themed
        questions in a Family Feud–style game. After the game, we’ll reveal the
        Masterpiece backgrounds created during the anniversary stream.
      </p>
      <a
        className="mt-6 inline-block rounded-full bg-sky-800 px-6 py-3 font-bold text-white hover:bg-sky-700"
        href="https://www.twitch.tv/upreal_"
      >
        Watch on Twitch
      </a>
    </main>
  );
}
