"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./community.module.css";

export function CommunityArtwork({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) return <span className={styles.artFallback} role="img" aria-label={`Artwork unavailable for ${name}`}>☁ ✦</span>;
  return <Image src={src} alt={name} width={240} height={210} sizes="(max-width: 520px) 40vw, (max-width: 900px) 27vw, 15rem" onError={() => setFailed(true)} />;
}
