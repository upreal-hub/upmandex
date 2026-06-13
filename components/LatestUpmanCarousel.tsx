"use client";

import { useState } from "react";
import Link from "next/link";

type Upman = {
  slug: string;
  name: string;
  image: string;
  rarity: string;
  creator: string;
};

type Props = {
  upmans: Upman[];
};

export default function LatestUpmanCarousel({
  upmans,
}: Props) {

  const [index, setIndex] =
    useState(0);

  const current =
    upmans[index];

  const rarityColor = {
    Common: "text-green-400",
    Rare: "text-blue-400",
    Epic: "text-purple-400",
    Mythic: "text-red-400",
    Legendary: "text-yellow-400",
  }[current.rarity];

  function previous() {
    setIndex(
      index === 0
        ? upmans.length - 1
        : index - 1
    );
  }

  function next() {
    setIndex(
      index ===
        upmans.length - 1
        ? 0
        : index + 1
    );
  }

  return (
    <section className="border border-slate-700 rounded-2xl p-12 mt-16 bg-white/80
shadow-2xl">

      <h2 className=" text-5xl font-black text-sky-800 text-center mb-2">
        ✨ Featured Creation
      </h2>

      <p className="text-center opacity-60 mb-12">
        Discover the latest additions to the Upmandex
      </p>

      <div className="flex justify-center items-center gap-12">

        <button
          onClick={previous}
          className="text-5xl opacity-50 hover:opacity-100 transition"
        >
          ❮
        </button>

        <Link
          href={`/upmans/${current.slug}`}
        >
          <div className="text-center cursor-pointer">

            <img
              src={current.image}
              alt={current.name}
              className="
w-56 h-56
md:w-72 md:h-72
xl:w-96 xl:h-96 object-contain mx-auto hover:scale-105 transition duration-300"
            />

            <h3 className="text-4xl font-bold mt-6">
              {current.name}
            </h3>

            <p className="mt-3 text-lg opacity-70">
              Created by {current.creator}
            </p>

            <p
              className={`mt-3 text-xl font-bold ${rarityColor}`}
            >
              {current.rarity}
            </p>

          </div>
        </Link>

        <button
          onClick={next}
          className="text-5xl opacity-50 hover:opacity-100 transition"
        >
          ❯
        </button>

      </div>

      <div className="flex justify-center gap-4 mt-10">

        {upmans.map(
          (_, dotIndex) => (
            <button
              key={dotIndex}
              onClick={() =>
                setIndex(
                  dotIndex
                )
              }
              className={`w-4 h-4 rounded-full transition ${
                dotIndex === index
                  ? "bg-white scale-125"
                  : "bg-slate-600"
              }`}
            />
          )
        )}

      </div>

    </section>
  );
}