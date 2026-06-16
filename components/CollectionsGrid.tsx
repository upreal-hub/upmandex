"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type User = {
  id: string;
  twitchLogin: string;
  displayName: string;
  inventory: any[];
};

type Props = {
  users: User[];
  totalUpmans: number;
};

export default function CollectionsGrid({
  users,
  totalUpmans,
}: Props) {
  const [sortBy, setSortBy] =
    useState("alphabetical");

  const sortedUsers =
    useMemo(() => {
      const data = [...users];

      switch (sortBy) {
        case "most-owned":
          data.sort(
            (a, b) =>
              b.inventory.length -
              a.inventory.length
          );
          break;

        case "least-owned":
          data.sort(
            (a, b) =>
              a.inventory.length -
              b.inventory.length
          );
          break;

        case "highest-completion":
          data.sort(
            (a, b) =>
              b.inventory.length -
              a.inventory.length
          );
          break;

        case "lowest-completion":
          data.sort(
            (a, b) =>
              a.inventory.length -
              b.inventory.length
          );
          break;

        case "alphabetical":
        default:
          data.sort((a, b) =>
            a.displayName.localeCompare(
              b.displayName
            )
          );
      }

      return data;
    }, [users, sortBy]);

  return (
    <>
      <div className="mb-8">

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

          <option value="most-owned">
            🏆 Most Upmans
          </option>

          <option value="least-owned">
            📉 Least Upmans
          </option>

          <option value="highest-completion">
            🎯 Highest Completion
          </option>

          <option value="lowest-completion">
            📉 Lowest Completion
          </option>

        </select>

      </div>

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-2
          xl:grid-cols-3
          gap-6
        "
      >

        {sortedUsers.map((user) => {

          const ownedCount =
            user.inventory.length;

          const completion =
            totalUpmans > 0
              ? (
                  (ownedCount /
                    totalUpmans) *
                  100
                ).toFixed(1)
              : "0";

          return (
            <Link
              key={user.id}
              href={`/collection/${user.twitchLogin}`}
            >

              <div
                className="
                  border
                  border-slate-700
                  rounded-xl
                  p-6
                  hover:border-blue-500
                  transition
                  cursor-pointer
                "
              >

                <h2 className="text-2xl font-bold mb-4">
                  👤 {user.displayName}
                </h2>

                <p>
                  📦 {ownedCount} / {totalUpmans}
                </p>

                <p className="mt-2 opacity-70">
                  🎯 {completion}% Complete
                </p>

              </div>

            </Link>
          );
        })}

      </div>
    </>
  );
}