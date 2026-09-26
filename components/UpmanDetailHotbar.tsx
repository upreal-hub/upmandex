"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DetailView = "UPMAN" | "CREATOR" | "PERSON";

type Props = {
  active: DetailView;
  upmanHref: string;
  creatorHref: string;
  personHref?: string;
};

export default function UpmanDetailHotbar({ active, upmanHref, creatorHref, personHref }: Props) {
  const [requestedView, setRequestedView] = useState<DetailView | null>(null);
  const items = [
    { label: "UPMAN" as const, href: upmanHref },
    { label: "CREATOR" as const, href: creatorHref },
    ...(personHref ? [{ label: "PERSON" as const, href: personHref }] : []),
  ];

  useEffect(() => {
    if (requestedView !== active) {
      return;
    }

    const target = document.getElementById(`${active.toLowerCase()}-view`);
    if (!target) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  }, [active, requestedView]);

  function requestSelectedView(view: DetailView) {
    if (view === active) {
      return;
    }

    setRequestedView(view);
  }

  return (
    <nav className="upman-detail-hotbar" aria-label="Upman entry views">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`upman-detail-hotbar-item${item.label === active ? " upman-detail-hotbar-item-active" : ""}`}
          aria-current={item.label === active ? "page" : undefined}
          onClick={() => requestSelectedView(item.label)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
