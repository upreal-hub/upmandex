"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

export default function LoginButton() {
  const { data: session } = useSession();

  if (session?.user) {
    const username = session.user.name ?? "";

    return (
      <div className="profile-control">
        <Link href="/profile" className="profile-link" aria-label="Open my profile">
          {session.user.image ? (
            <img src={session.user.image} alt="" className="profile-avatar" />
          ) : (
            <span aria-hidden="true" className="profile-avatar profile-avatar-fallback">☁</span>
          )}
          <span className="profile-name">{username}</span>
        </Link>
        <div className="profile-menu">
          <Link href="/profile">My profile</Link>
          {username.toLowerCase() === "upreal_" && <Link href="/admin">Admin</Link>}
          <button type="button" onClick={() => signOut()}>Log out</button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => signIn("twitch")} className="twitch-login-button">
      Login with Twitch
    </button>
  );
}
