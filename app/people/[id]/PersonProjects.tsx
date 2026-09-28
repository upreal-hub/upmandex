"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./person-projects.module.css";

type Project = {
  id: string;
  title: string;
  description: string;
};

type Draft = { title: string; description: string };

const emptyDraft: Draft = { title: "", description: "" };

export default function PersonProjects({ personId, projects, isOwner }: { personId: string; projects: Project[]; isOwner: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function beginAdd() {
    setAdding(true);
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
    setNotice(null);
  }

  function beginEdit(project: Project) {
    setAdding(false);
    setEditingId(project.id);
    setDraft({ title: project.title, description: project.description });
    setError(null);
    setNotice(null);
  }

  function cancelForm() {
    setAdding(false);
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyId) return;
    const target = editingId;
    setBusyId(target ?? "new");
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(target ? `/api/people/${personId}/projects/${target}` : `/api/people/${personId}/projects`, {
        method: target ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Unable to save project");
        return;
      }
      setNotice(target ? "Project note updated." : "Project note added.");
      setAdding(false);
      setEditingId(null);
      setDraft(emptyDraft);
      router.refresh();
    } catch {
      setError("Unable to save project");
    } finally {
      setBusyId(null);
    }
  }

  async function move(projectId: string, direction: "earlier" | "later") {
    if (busyId) return;
    setBusyId(projectId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/people/${personId}/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "move", direction }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Unable to reorder project");
        return;
      }
      router.refresh();
    } catch {
      setError("Unable to reorder project");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(project: Project) {
    if (busyId || !window.confirm(`Delete “${project.title}”? This cannot be undone.`)) return;
    setBusyId(project.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/people/${personId}/projects/${project.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Unable to delete project");
        return;
      }
      setNotice("Project note deleted.");
      router.refresh();
    } catch {
      setError("Unable to delete project");
    } finally {
      setBusyId(null);
    }
  }

  if (!projects.length && !isOwner) return null;

  const formOpen = adding || editingId !== null;
  return (
    <section className={styles.section} aria-labelledby="person-projects-heading">
      <div className={styles.heading}>
        <div><h2 id="person-projects-heading">PROJECTS</h2></div>
        {isOwner && !formOpen && <button type="button" onClick={beginAdd}>Add project</button>}
      </div>

      {isOwner && formOpen && <form className={styles.form} onSubmit={save}>
        <label>Project title <span>{draft.title.length}/100</span><input value={draft.title} maxLength={100} required autoFocus onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
        <label>Short description <span>{draft.description.length}/1000</span><textarea value={draft.description} maxLength={1000} required rows={4} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>
        <div className={styles.formActions}><button type="submit" disabled={busyId !== null}>{busyId ? "Saving…" : "Save project"}</button><button type="button" className={styles.cancel} disabled={busyId !== null} onClick={cancelForm}>Cancel</button></div>
      </form>}

      {error && <p className={styles.feedbackError} role="alert">{error}</p>}
      {notice && <p className={styles.feedbackSuccess} role="status">{notice}</p>}

      {projects.length ? <div className={styles.notes}>
        {projects.map((project, index) => <article key={project.id} className={styles.note}>
          {editingId === project.id ? null : <><h3>{project.title}</h3><p>{project.description}</p></>}
          {isOwner && editingId !== project.id && <div className={styles.actions}>
            <button type="button" onClick={() => beginEdit(project)} disabled={busyId !== null}>Edit</button>
            <button type="button" onClick={() => move(project.id, "earlier")} disabled={index === 0 || busyId !== null} aria-label={`Move ${project.title} earlier`}>Move earlier</button>
            <button type="button" onClick={() => move(project.id, "later")} disabled={index === projects.length - 1 || busyId !== null} aria-label={`Move ${project.title} later`}>Move later</button>
            <button type="button" className={styles.delete} onClick={() => remove(project)} disabled={busyId !== null}>Delete</button>
          </div>}
        </article>)}
      </div> : isOwner && !formOpen ? <div className={styles.empty}><p>Keep a small note about something you&apos;re building.</p><button type="button" onClick={beginAdd}>Add project</button></div> : null}
    </section>
  );
}
