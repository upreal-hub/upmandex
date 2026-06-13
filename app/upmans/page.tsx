import Link from "next/link";
import { upmans } from "@/data/upmans";
import UpmanCard from "@/components/UpmanCard";

export default function UpmansPage() {
  const commonCount =
    upmans.filter(
      (u) => u.rarity === "Common"
    ).length;

  const rareCount =
    upmans.filter(
      (u) => u.rarity === "Rare"
    ).length;

  const epicCount =
    upmans.filter(
      (u) => u.rarity === "Epic"
    ).length;

  const mythicCount =
    upmans.filter(
      (u) => u.rarity === "Mythic"
    ).length;

  const legendaryCount =
    upmans.filter(
      (u) => u.rarity === "Legendary"
    ).length;

  return (
    <main>

      <div className="mb-12">

        <h1 className="text-6xl font-black">
          UPMANDEX
        </h1>

        <p className="opacity-70 mt-3">
          Browse every creation in the collection
        </p>

      </div>

      <div className="flex gap-8 mb-12 flex-wrap text-lg">

        <span className="text-green-400">
          🟢 {commonCount}
        </span>

        <span className="text-blue-400">
          🔵 {rareCount}
        </span>

        <span className="text-purple-400">
          🟣 {epicCount}
        </span>

        <span className="text-red-400">
          🔴 {mythicCount}
        </span>

        <span className="text-yellow-400">
          🟡 {legendaryCount}
        </span>

      </div>

      <div className="grid grid-cols-2
sm:grid-cols-3
lg:grid-cols-4
xl:grid-cols-5
gap-8">

        {upmans.map((upman) => (
  <UpmanCard
    key={upman.slug}
    slug={upman.slug}
    name={upman.name}
    image={upman.image}
    rarity={upman.rarity as
  | "Common"
  | "Rare"
  | "Epic"
  | "Mythic"
  | "Legendary"}
  />
))}

      </div>

    </main>
  );
}