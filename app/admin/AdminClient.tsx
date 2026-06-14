"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UpmanGenerator from "./UpmanGenerator";

export default function AdminPage() {

  const [selectedImage, setSelectedImage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [viewerName, setViewerName] =
    useState("");

  const [users, setUsers] =
  useState<any[]>([]);

  const [selectedUpman, setSelectedUpman] =
    useState("");

  const [editingUpman, setEditingUpman] =
    useState<any>(null);

  const [upmans, setUpmans] =
  useState<any[]>([]);

const [unregisteredImages, setUnregisteredImages] =
  useState<string[]>([]);

  async function loadImages() {
    const response =
      await fetch("/api/upmans");

    const pngs = await response.json();
    const upmansResponse =
  await fetch("/api/admin-upmans");

const dbUpmans =
  await upmansResponse.json();

setUpmans(dbUpmans);
const usersResponse =
  await fetch("/api/users");

const dbUsers =
  await usersResponse.json();

setUsers(dbUsers);
    const registered = dbUpmans.map(
  (u: any) =>
    u.slug.toLowerCase()
);
    const missing = pngs.filter(
      (png: string) =>
        !registered.includes(
          png.toLowerCase()
        )
    );

    setUnregisteredImages(missing);
  }

  useEffect(() => {
    loadImages();
  }, []);

  const totalCreators = new Set(
    upmans.map((u) => u.creator)
  ).size;

  const latestUpmans =
    upmans.slice(-5).reverse();

  const filteredUpmans =
    upmans.filter((u) =>
      u.name
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );

  return (
    <main className="min-h-screen bg-slate-900 text-white p-8">

      <h1 className="text-5xl font-bold mb-10">
        🛠 Admin Panel
      </h1>

      <div className="grid grid-cols-3 gap-6 mb-10">

        <div className="border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-bold">
            📦 Total Upmans
          </h2>

          <p className="text-4xl mt-4">
            {upmans.length}
          </p>
        </div>

        <div className="border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-bold">
            🎨 Creators
          </h2>

          <p className="text-4xl mt-4">
            {totalCreators}
          </p>
        </div>

        <div className="border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-bold">
            ⚠ Pending Imports
          </h2>

          <p className="text-4xl mt-4">
            {unregisteredImages.length}
          </p>
        </div>

      </div>
<select
  value={viewerName}
  onChange={(e) =>
    setViewerName(
      e.target.value
    )
  }
  className="bg-slate-800 p-3 rounded"
>
  <option value="">
    Select Viewer
  </option>

  {users.map((user) => (
    <option
      key={user.twitchLogin}
      value={user.twitchLogin}
    >
      {user.displayName}
    </option>
  ))}
</select>
      <h2 className="text-3xl font-bold mb-6">
        🆕 Latest Upmans
      </h2>

      <div className="space-y-4 mb-12">

        {(
  search
    ? filteredUpmans
    : latestUpmans
).map((upman) => (
  <div
    key={upman.slug}
    className="border border-slate-700 rounded-lg p-4 flex justify-between items-center"
  >
    <div className="flex items-center gap-4">

  <img
    src={upman.image}
    alt={upman.name}
    className="w-16 h-16 object-contain"
  />

  <span>
    {upman.name}
  </span>

</div>

<div className="flex gap-2">

  <button
    onClick={() =>
      setEditingUpman(upman)
    }
    className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
  >
    ✏ Edit
  </button>

  <button
    onClick={async () => {
      const confirmed =
        confirm(
          `Delete ${upman.name} ?`
        );

      if (!confirmed) {
        return;
      }

      const response =
        await fetch(
          "/api/delete-upman",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              slug: upman.slug,
            }),
          }
        );

      if (response.ok) {
        alert(
          `${upman.name} deleted`
        );

        location.reload();
      } else {
        alert(
          "Delete failed"
        );
      }
    }}
    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
  >
    🗑 Delete
  </button>

</div>
  </div>
))}

      </div>

      <h2 className="text-3xl font-bold mb-6">
        ⚠ Unregistered Image
      </h2>

      <div className="space-y-4">

        {unregisteredImages.map((image) => (
          <div
            key={image}
            className="border border-yellow-500 rounded-lg p-4 flex justify-between items-center"
          >
            <div className="flex items-center gap-4">

  <img
    src={`/upmans/${image}.png`}
    alt={image}
    className="w-16 h-16 object-contain"
  />

  <span>
    {image}.png
  </span>

</div>

            <button
              onClick={() => {
                const formatted =
                  image.charAt(0).toUpperCase() +
                  image.slice(1);

                setSelectedImage(formatted);
              }}
              className="border border-green-500 rounded px-3 py-1"
            >
              Generate Entry
            </button>

          </div>
        ))}

      </div>

      <div className="mt-12">
        <Link
          href="/"
          className="text-blue-400 hover:underline"
        >
          ← Back Home
        </Link>
      </div>

<div className="border border-slate-700 rounded-lg p-6 mt-12">

  <h2 className="text-3xl font-bold mb-6">
    🎁 Give Upman
  </h2>

  <div className="grid gap-4">

    <input
      type="text"
      placeholder="Viewer Name"
      value={viewerName}
      onChange={(e) =>
        setViewerName(
          e.target.value
        )
      }
      className="bg-slate-800 p-3 rounded"
    />

    <select
      value={selectedUpman}
      onChange={(e) =>
        setSelectedUpman(
          e.target.value
        )
      }
      className="bg-slate-800 p-3 rounded"
    >
      <option value="">
        Select Upman
      </option>

      {upmans.map((upman) => (
        <option
          key={upman.slug}
          value={upman.slug}
        >
          {upman.name}
        </option>
      ))}
    </select>

    <button
      onClick={async () => {
        if (
          !viewerName ||
          !selectedUpman
        ) {
          alert(
            "Fill all fields"
          );
          return;
        }

        const response =
          await fetch(
            "/api/give-upman",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                viewer:
                  viewerName,
                slug:
                  selectedUpman,
              }),
            }
          );

        const data =
          await response.json();

        if (response.ok) {
          alert(
            "✅ Upman given"
          );

          setViewerName("");
          setSelectedUpman("");
        } else {
          alert(
            `❌ ${data.error}`
          );
        }
      }}
      className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-bold"
    >
      🎁 Give Upman
    </button>

  </div>

</div>

      <UpmanGenerator
  initialName={selectedImage}
  editingUpman={editingUpman}
  onImported={loadImages}
/>
    </main>
  );
}