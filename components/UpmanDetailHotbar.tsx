import Link from "next/link";

type DetailView = "UPMAN" | "CREATOR" | "PERSON";

type Props = {
  active: Exclude<DetailView, "PERSON">;
  upmanHref: string;
  creatorHref: string;
};

export default function UpmanDetailHotbar({ active, upmanHref, creatorHref }: Props) {
  const items = [
    { label: "UPMAN" as const, href: upmanHref },
    { label: "CREATOR" as const, href: creatorHref },
  ];

  return (
    <nav className="upman-detail-hotbar" aria-label="Upman entry views">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`upman-detail-hotbar-item${item.label === active ? " upman-detail-hotbar-item-active" : ""}`}
          aria-current={item.label === active ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
