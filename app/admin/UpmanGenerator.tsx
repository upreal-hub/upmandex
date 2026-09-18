"use client";

import { useState } from "react";
import type { AdminUpman } from "./AdminClient";

type Props = {
  initialName?: string;
  editingUpman?: AdminUpman | null;
  onImported?: () => void;
};

export default function UpmanGenerator({
  initialName = "",
  editingUpman,
  onImported,
}: Props) {
  const [name, setName] = useState(
    editingUpman?.name ?? initialName
  );
  const [creator, setCreator] = useState(
    editingUpman?.creator ?? ""
  );
  const [rarity, setRarity] = useState(
    editingUpman?.rarity ?? "Common"
  );
  const [previousInputs, setPreviousInputs] = useState({
    initialName,
    editingUpman,
  });

  if (
    previousInputs.initialName !== initialName ||
    previousInputs.editingUpman !== editingUpman
  ) {
    setPreviousInputs({ initialName, editingUpman });

    if (editingUpman) {
      setName(editingUpman.name);
      setCreator(editingUpman.creator);
      setRarity(editingUpman.rarity);
    } else {
      setName(initialName);
    }
  }
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "");

  async function importUpman() {
    if (!name.trim()) {
      alert("Enter a name");
      return;
    }

    try {
      const payload = {
        slug,
        name,
        rarity,
        creator,
        image: `/upmans/${slug}.png`,
      };

      const response = await fetch(
        "/api/import-upman",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          `❌ ${data.error}`
        );
        return;
      }

      alert(
        `✅ ${name} imported successfully`
      );

      setName("");
      setCreator("");
      setRarity("Common");

      onImported?.();
    } catch (error) {
      console.error(error);

      alert(
        `❌ ${String(error)}`
      );
    }
  }

  async function saveChanges() {
  if (!editingUpman) {
    return;
  }

  try {
    const response =
      await fetch(
        "/api/edit-upman",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            slug:
              editingUpman.slug,
            name,
            creator,
            rarity,
          }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      alert(
        `❌ ${data.error}`
      );
      return;
    }

    alert(
      `✅ ${name} updated`
    );

    location.reload();
  } catch (error) {
    alert(
      `❌ ${String(error)}`
    );
  }
}

  const generated = `{
  "slug": "${slug}",
  "name": "${name}",
  "rarity": "${rarity}",
  "creator": "${creator}",
  "image": "/upmans/${slug}.png"
}`;

  return (
    <div className="mt-12 rounded-2xl border border-sky-100 bg-white/80 p-6 shadow-sm">

      <h2 className="text-3xl font-bold mb-6">
        ➕ New Upman
      </h2>

      <div className="grid gap-4">

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          className="rounded-xl border border-sky-200 bg-white p-3 text-slate-800"
        />

        <input
          type="text"
          placeholder="Creator"
          value={creator}
          onChange={(e) =>
            setCreator(e.target.value)
          }
          className="rounded-xl border border-sky-200 bg-white p-3 text-slate-800"
        />

        <select
          value={rarity}
          onChange={(e) =>
            setRarity(e.target.value)
          }
          className="rounded-xl border border-sky-200 bg-white p-3 text-slate-800"
        >
          <option>Common</option>
          <option>Rare</option>
          <option>Epic</option>
          <option>Mythic</option>
          <option>Legendary</option>
        </select>

      </div>

      <pre className="mt-6 overflow-auto rounded-xl bg-sky-50 p-4 text-sm text-slate-800">
        {generated}
      </pre>

      <button
  onClick={
    editingUpman
      ? saveChanges
      : importUpman
  }
  className="mt-6 bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
>
  {editingUpman
    ? "💾 Save Changes"
    : "🚀 Import Into Dex"}
</button>

    </div>
  );
}
