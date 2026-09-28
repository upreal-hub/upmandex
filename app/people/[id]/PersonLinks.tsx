"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PERSON_LINK_PLATFORM_DETAILS, PERSON_LINK_PLATFORMS, type PersonLinkPlatform } from "@/lib/person-link-platforms";

import styles from "./person-links.module.css";

type PersonLink = { id: string; platform: PersonLinkPlatform; url: string };
type Draft = { platform: PersonLinkPlatform; url: string };

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

export default function PersonLinks({ personId, personName, links, isOwner }: { personId: string; personName: string; links: PersonLink[]; isOwner: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const usedPlatforms = new Set(links.map((link) => link.platform));
  const availablePlatforms = PERSON_LINK_PLATFORMS.filter((platform) => !usedPlatforms.has(platform));

  function openAdd() {
    if (!availablePlatforms.length) return;
    setAdding(true); setEditingId(null); setDraft({ platform: availablePlatforms[0], url: "" }); setError(null); setNotice(null);
  }

  function openEdit(link: PersonLink) {
    setAdding(false); setEditingId(link.id); setDraft({ platform: link.platform, url: link.url }); setError(null); setNotice(null);
  }

  function cancel() { setAdding(false); setEditingId(null); setDraft(null); setError(null); }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || busyId) return;
    const linkId = editingId;
    setBusyId(linkId ?? "new"); setError(null); setNotice(null);
    try {
      const response = await fetch(linkId ? `/api/people/${personId}/links/${linkId}` : `/api/people/${personId}/links`, {
        method: linkId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) { setError(data?.error ?? "Unable to save link"); return; }
      setNotice(linkId ? "Link updated." : "Link added.");
      setAdding(false); setEditingId(null); setDraft(null); router.refresh();
    } catch { setError("Unable to save link"); } finally { setBusyId(null); }
  }

  async function move(linkId: string, direction: "earlier" | "later") {
    if (busyId) return;
    setBusyId(linkId); setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/people/${personId}/links/${linkId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "move", direction }) });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) { setError(data?.error ?? "Unable to reorder link"); return; }
      router.refresh();
    } catch { setError("Unable to reorder link"); } finally { setBusyId(null); }
  }

  async function remove(link: PersonLink) {
    const label = PERSON_LINK_PLATFORM_DETAILS[link.platform].label;
    if (busyId || !window.confirm(`Delete your ${label} link? This cannot be undone.`)) return;
    setBusyId(link.id); setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/people/${personId}/links/${link.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) { setError(data?.error ?? "Unable to delete link"); return; }
      setNotice("Link deleted."); router.refresh();
    } catch { setError("Unable to delete link"); } finally { setBusyId(null); }
  }

  if (!isOwner) return null;
  const formOpen = adding || editingId !== null;
  const renderForm = (editing: boolean) => draft && <form className={styles.form} onSubmit={save}>
    <label>Platform<select value={draft.platform} onChange={(event) => setDraft((current) => current ? { ...current, platform: event.target.value as PersonLinkPlatform } : current)}>
      {PERSON_LINK_PLATFORMS.map((platform) => <option key={platform} value={platform} disabled={usedPlatforms.has(platform) && platform !== draft.platform}>{PERSON_LINK_PLATFORM_DETAILS[platform].label}</option>)}
    </select></label>
    <label>URL<input type="url" value={draft.url} maxLength={2048} required placeholder="https://…" onChange={(event) => setDraft((current) => current ? { ...current, url: event.target.value } : current)} /></label>
    <div className={styles.formActions}><button type="submit" disabled={busyId !== null}>{busyId ? "Saving…" : editing ? "Save link" : "Add link"}</button><button type="button" className={styles.cancel} disabled={busyId !== null} onClick={cancel}>Cancel</button></div>
  </form>;

  return <details className={styles.manager}>
    <summary>Manage links <span>{links.length}</span></summary>
    <section className={styles.section} aria-labelledby="person-links-heading">
    <div className={styles.heading}><div><h2 id="person-links-heading">Links</h2></div>{!formOpen && availablePlatforms.length > 0 && <button type="button" onClick={openAdd}>Add link</button>}</div>
    {isOwner && adding && renderForm(false)}
    {error && <p className={styles.feedbackError} role="alert">{error}</p>}
    {notice && <p className={styles.feedbackSuccess} role="status">{notice}</p>}
    {links.length ? <div className={styles.links}>{links.map((link, index) => {
      const details = PERSON_LINK_PLATFORM_DETAILS[link.platform];
      return <article className={styles.link} key={link.id}>
        {editingId === link.id ? renderForm(true) : <>
          <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${personName}'s ${details.label} in a new tab`}>
            <span aria-hidden="true" className={styles.marker}>{details.marker}</span>
            <span><strong>{details.label}</strong><small>{hostname(link.url)}</small></span>
            <span aria-hidden="true" className={styles.external}>↗</span>
          </a>
          <div className={styles.actions}>
            <button type="button" onClick={() => openEdit(link)} disabled={busyId !== null}>Edit</button>
            <button type="button" onClick={() => move(link.id, "earlier")} disabled={index === 0 || busyId !== null} aria-label={`Move ${details.label} earlier`}>Move earlier</button>
            <button type="button" onClick={() => move(link.id, "later")} disabled={index === links.length - 1 || busyId !== null} aria-label={`Move ${details.label} later`}>Move later</button>
            <button type="button" className={styles.delete} onClick={() => remove(link)} disabled={busyId !== null}>Delete</button>
          </div>
        </>}
      </article>;
    })}</div> : !formOpen ? <div className={styles.empty}><p>Share the places where people can find your work.</p>{availablePlatforms.length > 0 && <button type="button" onClick={openAdd}>Add link</button>}</div> : null}
    </section>
  </details>;
}
