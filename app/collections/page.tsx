import Link from "next/link";
import { readFile } from "fs/promises";
import path from "path";
import { upmans } from "@/data/upmans";
import Navbar from "@/components/Navbar";

export default async function CollectionsPage() {

  const filePath = path.join(
    process.cwd(),
    "data",
    "inventories.json"
  );

  const content =
    await readFile(
      filePath,
      "utf8"
    );

  const inventories =
    JSON.parse(content);

  const viewers =
    Object.entries(inventories);

  return (
    <main>

      <h1 className="text-6xl font-bold mb-4">
        🎒 Collections
      </h1>

      <p className="opacity-70 mb-10">
        Browse collector profiles
      </p>

      <div className="grid grid-cols-1
md:grid-cols-2
xl:grid-cols-3
gap-6">

        {viewers.map(
          ([viewer, data]: any) => {

            const ownedCount =
              data.upmans.length;

            const completion =
              (
                (ownedCount /
                  upmans.length) *
                100
              ).toFixed(1);

            return (
              <Link
                key={viewer}
                href={`/collection/${viewer}`}
              >

                <div className="border border-slate-700 rounded-xl p-6 hover:border-blue-500 transition cursor-pointer">

                  <h2 className="text-2xl font-bold mb-4">
                    👤 {viewer}
                  </h2>

                  <p>
                    📦 {ownedCount} / {upmans.length}
                  </p>

                  <p className="mt-2 opacity-70">
                    🎯 {completion}% Complete
                  </p>

                </div>

              </Link>
            );
          }
        )}

      </div>

    </main>
  );
}