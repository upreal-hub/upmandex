"use client";

import { useMemo, useState } from "react";
import UpmanCard from "./UpmanCard";

type Upman = {
  slug: string;
  name: string;
  image: string;
  rarity: string;
  creator: string;
  ownersCount: number;
};

type Props = {
  upmans: Upman[];
};

export default function UpmansGrid({
  upmans,
}: Props) {
  const [search, setSearch] =
    useState("");

  const [sortBy, setSortBy] =
    useState("alphabetical");

  const [rarityFilter, setRarityFilter] =
    useState("All");

  const filteredUpmans =
    useMemo(() => {
      let data = [...upmans];

      if (rarityFilter !== "All") {
        data = data.filter(
          (u) =>
            u.rarity ===
            rarityFilter
        );
      }

      if (search.trim()) {
        data = data.filter(
          (u) =>
            u.name
              .toLowerCase()
              .includes(
                search.toLowerCase()
              ) ||
            u.creator
              .toLowerCase()
              .includes(
                search.toLowerCase()
              )
        );
      }

      const rarityOrder = {
        Common: 1,
        Rare: 2,
        Epic: 3,
        Mythic: 4,
        Legendary: 5,
      };

      switch (sortBy) {
        case "alphabetical":
          data.sort((a, b) =>
            a.name.localeCompare(
              b.name
            )
          );
          break;

        case "alphabetical-reverse":
          data.sort((a, b) =>
            b.name.localeCompare(
              a.name
            )
          );
          break;

        case "rarity":
          data.sort(
            (a, b) =>
              rarityOrder[
                a.rarity as keyof typeof rarityOrder
              ] -
              rarityOrder[
                b.rarity as keyof typeof rarityOrder
              ]
          );
          break;

        case "rarity-reverse":
          data.sort(
            (a, b) =>
              rarityOrder[
                b.rarity as keyof typeof rarityOrder
              ] -
              rarityOrder[
                a.rarity as keyof typeof rarityOrder
              ]
          );
          break;

        case "most-owned":
          data.sort(
            (a, b) =>
              b.ownersCount -
              a.ownersCount
          );
          break;

        case "least-owned":
          data.sort(
            (a, b) =>
              a.ownersCount -
              b.ownersCount
          );
          break;

        case "creator":
          data.sort((a, b) =>
            a.creator.localeCompare(
              b.creator
            )
          );
          break;

        case "creator-reverse":
          data.sort((a, b) =>
            b.creator.localeCompare(
              a.creator
            )
          );
          break;
      }

      return data;
    }, [
      upmans,
      search,
      sortBy,
      rarityFilter,
    ]);

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 mb-10">

        <input
          type="text"
          placeholder="🔍 Search Upman..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          className="
            px-4
            py-3
            rounded-xl
            border
            border-slate-300
            flex-1
          "
        />

        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(
              e.target.value
            )
          }
          className="
            px-4
            py-3
            rounded-xl
            border
            border-slate-300
          "
        >
          <option value="alphabetical">
            🔤 Alphabetical
          </option>

          <option value="alphabetical-reverse">
            🔤 Alphabetical Z-A
          </option>

          <option value="rarity">
            🌈 Rarity
          </option>

          <option value="rarity-reverse">
            🌈 Rarity Reversed
          </option>

          <option value="most-owned">
            👥 Most Owned
          </option>

          <option value="least-owned">
            👥 Least Owned
          </option>

          <option value="creator">
            🎨 Creator A-Z
          </option>

          <option value="creator-reverse">
            🎨 Creator Z-A
          </option>
        </select>

        <select
          value={rarityFilter}
          onChange={(e) =>
            setRarityFilter(
              e.target.value
            )
          }
          className="
            px-4
            py-3
            rounded-xl
            border
            border-slate-300
          "
        >
          <option>All</option>
          <option>Common</option>
          <option>Rare</option>
          <option>Epic</option>
          <option>Mythic</option>
          <option>Legendary</option>
        </select>

      </div>

      <div
        className="
          grid
          grid-cols-2
          sm:grid-cols-3
          lg:grid-cols-4
          xl:grid-cols-5
          gap-8
        "
      >
        {filteredUpmans.map(
          (upman) => (
            <UpmanCard
              key={upman.slug}
              slug={upman.slug}
              name={upman.name}
              image={upman.image}
              rarity={
                upman.rarity as
                  | "Common"
                  | "Rare"
                  | "Epic"
                  | "Mythic"
                  | "Legendary"
              }
            />
          )
        )}
      </div>
    </>
  );
}