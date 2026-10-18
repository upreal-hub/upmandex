"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

export default function LoginButton() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const control = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dismiss = (event: Event) => {
      if (!control.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("focusin", dismiss); document.removeEventListener("keydown", escape); };
  }, [open]);

  if (session?.user) {
    const username = session.user.name ?? "";

    return (
      <div ref={control} className="profile-control">
        <button ref={trigger} type="button" className="profile-link" aria-label="My account" aria-expanded={open} aria-controls="profile-menu" onClick={() => setOpen(!open)}>
          {session.user.image ? (
            <img src={session.user.image} alt="" className="profile-avatar" />
          ) : (
            <span aria-hidden="true" className="profile-avatar profile-avatar-fallback">☁</span>
          )}
          <span className="profile-name">{username}</span>
          <span aria-hidden="true">⌄</span>
        </button>
        {open && <div id="profile-menu" className="profile-menu" onClick={() => setOpen(false)}>
          <Link href="/profile">My profile</Link>
          {username.toLowerCase() === "upreal_" && <Link href="/admin">Admin</Link>}
          <button type="button" onClick={() => signOut()}>Log out</button>
        </div>}
      </div>
    );
  }

  return (
    <button type="button" onClick={() => signIn("twitch")} className="twitch-login-button">
      Login with Twitch
    </button>
  );
}
