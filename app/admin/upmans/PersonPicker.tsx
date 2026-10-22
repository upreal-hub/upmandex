"use client";

import { useId, useMemo, useState } from "react";

export type PersonPickerOption = {
  id: string;
  displayName: string;
  user?: { twitchLogin: string } | null;
};

function describePerson(person: PersonPickerOption) {
  return person.user?.twitchLogin
    ? `${person.displayName} · @${person.user.twitchLogin}`
    : `${person.displayName} · Person ID ${person.id.slice(-6)}`;
}

export default function PersonPicker({
  label,
  people,
  value,
  onChange,
  noneLabel,
  disabled = false,
}: {
  label: string;
  people: PersonPickerOption[];
  value: string;
  onChange: (personId: string) => void;
  noneLabel: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();
  const selected = people.find((person) => person.id === value) ?? null;
  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return people;
    return people.filter((person) =>
      [person.displayName, person.user?.twitchLogin ?? "", person.id]
        .some((candidate) => candidate.toLocaleLowerCase().includes(normalizedQuery)),
    );
  }, [people, query]);

  function select(personId: string) {
    onChange(personId);
    setQuery("");
    setIsOpen(false);
  }

  return (
    <div className="grid gap-2">
      <label className="text-sm font-bold text-sky-900" htmlFor={listId}>
        {label}
      </label>
      <input
        id={listId}
        type="search"
        value={isOpen ? query : selected ? describePerson(selected) : ""}
        disabled={disabled}
        placeholder={selected ? describePerson(selected) : "Search by Person, Twitch login, or ID"}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={`${listId}-options`}
        aria-expanded={isOpen}
        onFocus={() => {
          setQuery("");
          setIsOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setQuery("");
            setIsOpen(false);
          }
        }}
        className="rounded-xl border border-sky-200 bg-[#fffdf7] px-3 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {isOpen && !disabled && (
        <div id={`${listId}-options`} role="listbox" className="max-h-52 overflow-y-auto rounded-2xl border border-sky-100 bg-white p-1 shadow-sm">
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => select("")}
            className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-sky-700 transition hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-500"
          >
            {noneLabel}
          </button>
          {matches.map((person) => (
            <button
              type="button"
              role="option"
              aria-selected={person.id === value}
              key={person.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(person.id)}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-500 ${person.id === value ? "bg-sky-50 font-black text-sky-950" : "font-semibold text-sky-900"}`}
            >
              {describePerson(person)}
            </button>
          ))}
          {matches.length === 0 && <p className="px-3 py-3 text-sm font-medium text-sky-700">No People match this search.</p>}
        </div>
      )}
      {selected && <p className="text-xs font-medium text-sky-600">Selected: {describePerson(selected)}</p>}
    </div>
  );
}
