"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import styles from "./person-art.module.css";

type Artwork = { id: string; image: string; title: string | null };

export default function PersonArtworkGallery({ personId, personName, artworks, isOwner }: { personId: string; personName: string; artworks: Artwork[]; isOwner: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyArtworkId, setBusyArtworkId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || uploading) return;

    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      const formData = new FormData();
      formData.set("image", file);
      formData.set("title", title);
      const response = await fetch(`/api/people/${personId}/art`, { method: "POST", body: formData });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Unable to upload artwork");
        return;
      }
      setTitle("");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setNotice("Artwork added to your gallery.");
      router.refresh();
    } catch {
      setError("Unable to upload artwork");
    } finally {
      setUploading(false);
    }
  }

  async function move(artworkId: string, direction: "earlier" | "later") {
    if (busyArtworkId) return;
    setBusyArtworkId(artworkId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/people/${personId}/art/${artworkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Unable to reorder artwork");
        return;
      }
      router.refresh();
    } catch {
      setError("Unable to reorder artwork");
    } finally {
      setBusyArtworkId(null);
    }
  }

  async function remove(artwork: Artwork) {
    if (busyArtworkId || !window.confirm(`Delete ${artwork.title ? `“${artwork.title}”` : "this artwork"}? This cannot be undone.`)) return;

    setBusyArtworkId(artwork.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/people/${personId}/art/${artwork.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null) as { error?: string; warning?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Unable to delete artwork");
        return;
      }
      setNotice(data?.warning ?? "Artwork deleted.");
      router.refresh();
    } catch {
      setError("Unable to delete artwork");
    } finally {
      setBusyArtworkId(null);
    }
  }

  return (
    <main className={styles.galleryPage}>
      <header className={styles.galleryHeader}>
        <div><Link href={`/people/${personId}`} className={styles.back}>← Back to {personName}</Link><p>PERSONAL CORNER</p><h1>{personName}&apos;s art</h1></div>
        {isOwner && <span>Your gallery</span>}
      </header>

      {isOwner && <section className={styles.ownerTools} aria-labelledby="add-artwork-heading">
        <div><p>ADD ARTWORK</p><h2 id="add-artwork-heading">Share something you made</h2><small>PNG, JPEG, or WebP · up to 5 MiB · maximum 4096 × 4096 pixels</small></div>
        <form onSubmit={upload}>
          <label>Artwork image<input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></label>
          <label>Title <small>(optional)</small><input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="Give it a name" /></label>
          <button type="submit" disabled={!file || uploading}>{uploading ? "Uploading…" : "Add artwork"}</button>
        </form>
      </section>}

      {error && <p className={styles.feedbackError} role="alert">{error}</p>}
      {notice && <p className={styles.feedbackSuccess} role="status">{notice}</p>}

      {artworks.length ? <section className={styles.gallery} aria-label={`${personName}'s artworks`}>
        {artworks.map((artwork, index) => <article key={artwork.id} className={styles.artworkCard}>
          <div className={styles.artworkImage}><Image src={artwork.image} alt={artwork.title ? `${artwork.title} by ${personName}` : `Artwork by ${personName}`} fill sizes="(max-width: 600px) 92vw, (max-width: 1000px) 45vw, 30vw" /></div>
          {artwork.title && <h2>{artwork.title}</h2>}
          {isOwner && <div className={styles.artworkActions}>
            <button type="button" disabled={index === 0 || busyArtworkId !== null} onClick={() => move(artwork.id, "earlier")}>Move earlier</button>
            <button type="button" disabled={index === artworks.length - 1 || busyArtworkId !== null} onClick={() => move(artwork.id, "later")}>Move later</button>
            <button type="button" className={styles.deleteAction} disabled={busyArtworkId !== null} onClick={() => remove(artwork)}>Delete</button>
          </div>}
        </article>)}
      </section> : <section className={styles.galleryEmpty}><h2>No art shared yet</h2><p>{isOwner ? "Use the form above to begin your personal gallery." : `${personName} has not shared artwork yet.`}</p></section>}
    </main>
  );
}
