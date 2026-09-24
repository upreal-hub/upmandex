import Image from "next/image";
import Link from "next/link";

type Props = { slug: string; name: string; image: string; rarity: string; creator: string };

const rarityClassNames: Record<string, string> = {
  Common: "rarity-common", Rare: "rarity-rare", Epic: "rarity-epic",
  Mythic: "rarity-mythic", Legendary: "rarity-legendary",
};

const rarityVisualClassNames: Record<string, string> = {
  Common: "home-upman-common", Rare: "home-upman-rare", Epic: "home-upman-epic",
  Mythic: "home-upman-mythic", Legendary: "home-upman-legendary",
};

export default function HomeFeaturedUpmanCard({ slug, name, image, rarity, creator }: Props) {
  return (
    <Link href={`/upmans/${slug}`} className={`home-upman-card ${rarityVisualClassNames[rarity] ?? ""}`}>
      <div className="home-upman-art"><Image src={image} alt={name} width={280} height={220} /></div>
      <div className="home-upman-copy">
        <span className={`rarity-badge ${rarityClassNames[rarity] ?? ""}`}>{rarity}</span>
        <h3>{name}</h3><p>by {creator}</p>
      </div>
    </Link>
  );
}
