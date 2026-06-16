import Link from "next/link";

type Rarity =
  | "Common"
  | "Rare"
  | "Epic"
  | "Mythic"
  | "Legendary";

type Props = {
  slug: string;
  name: string;
  image: string;
  rarity: Rarity;
  owned?: boolean;
};

export default function UpmanCard({
  slug,
  name,
  image,
  rarity,
  owned = true,
}: Props) {
  const rarityStyle = {
    Common: {
      glow:
        "hover:shadow-[0_0_25px_rgba(34,197,94,0.20)]",
      badge:
        "bg-green-100 text-green-600",
    },

    Rare: {
      glow:
        "hover:shadow-[0_0_30px_rgba(59,130,246,0.30)]",
      badge:
        "bg-blue-100 text-blue-600",
    },

    Epic: {
      glow:
        "hover:shadow-[0_0_35px_rgba(168,85,247,0.35)]",
      badge:
        "bg-purple-100 text-purple-600",
    },

    Mythic: {
      glow:
        "hover:shadow-[0_0_40px_rgba(239,68,68,0.40)]",
      badge:
        "bg-red-100 text-red-500",
    },

    Legendary: {
      glow:
        "hover:shadow-[0_0_50px_rgba(250,204,21,0.55)]",
      badge:
        "bg-yellow-100 text-yellow-600",
    },
  }[rarity];

  return (
    <Link href={`/upmans/${slug}`}>
      <div
        className={`
          bg-white/70
          backdrop-blur-md
          rounded-3xl
          shadow-2xl
          p-6
          transition-all
          duration-300
          hover:-translate-y-2
          ${
            owned
              ? rarityStyle.glow
              : "opacity-50 grayscale"
          }
        `}
      >
        <img
          src={image}
          alt={name}
          className="
            w-44
            h-44
            object-contain
            mx-auto
          "
        />

        <h2 className="text-center text-xl font-bold text-sky-900 mt-4">
          {name}
        </h2>

        <div className="flex justify-center mt-3">

          {owned ? (
            <span
              className={`
                px-4
                py-1
                rounded-full
                text-sm
                font-bold
                ${rarityStyle.badge}
              `}
            >
              {rarity}
            </span>
          ) : (
            <span
              className="
                px-4
                py-1
                rounded-full
                text-sm
                font-bold
                bg-slate-200
                text-slate-600
              "
            >
              🔒 Not Collected
            </span>
          )}

        </div>
      </div>
    </Link>
  );
}