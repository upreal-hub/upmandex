"use client";

export default function ViewerAvatar({
  viewer,
  size = "h-16 w-16",
}: {
  viewer: { displayName: string; avatar: string | null };
  size?: string;
}) {
  const initial = viewer.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-sky-100 text-2xl font-black text-sky-700 ${size}`}>
      <span aria-hidden="true">{initial}</span>
      {viewer.avatar && (
        <img
          src={viewer.avatar}
          alt={`${viewer.displayName}'s avatar`}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
