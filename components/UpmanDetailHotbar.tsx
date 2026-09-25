type DetailView = "UPMAN" | "CREATOR" | "PERSON";

type Props = {
  active?: DetailView;
};

export default function UpmanDetailHotbar({ active = "UPMAN" }: Props) {
  const items = [
    { label: "UPMAN" as const, href: "#upman-view" },
  ].filter((item) => item.label === active);

  return (
    <nav className="upman-detail-hotbar" aria-label="Upman entry views">
      {items.map((item) => (
        <a key={item.label} href={item.href} className="upman-detail-hotbar-item" aria-current="page">
          {item.label}
        </a>
      ))}
    </nav>
  );
}
