"use client";

import Link from "next/link";
import {
  signIn,
  signOut,
  useSession,
} from "next-auth/react";

export default function LoginButton() {
  const {
    data: session,
  } = useSession();

  if (session?.user) {
    const username =
      session.user.name ?? "";

    return (
      <div className="flex items-center gap-4">

        <div className="flex flex-col">

          <Link
            href="/profile"
            className="
              text-xs
              text-sky-500
              hover:text-sky-700
              transition
            "
          >
            👤 Profile
          </Link>

          {username.toLowerCase() === "upreal_" && (
            <Link
              href="/admin"
              className="
                text-xs
                text-purple-500
                hover:text-purple-700
                transition
              "
            >
              🛠 Admin
            </Link>
          )}

        </div>

        <div className="flex items-center gap-3">

          <img
            src={session.user.image ?? ""}
            alt="Avatar"
            className="
              w-10
              h-10
              rounded-full
              border-2
              border-sky-300
            "
          />

          <div className="hidden md:block">

            <p className="text-sky-800 font-bold leading-none">
              {username}
            </p>

            <button
              onClick={() => signOut()}
              className="
                text-xs
                text-red-400
                hover:text-red-600
              "
            >
              Logout
            </button>

          </div>

        </div>

      </div>
    );
  }

  return (
    <button
      onClick={() =>
        signIn("twitch")
      }
      className="
        bg-purple-500
        hover:bg-purple-600
        text-white
        px-4
        py-2
        rounded-xl
        font-bold
        transition
      "
    >
      Login with Twitch
    </button>
  );
}