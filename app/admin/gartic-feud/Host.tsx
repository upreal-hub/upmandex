"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Game, Setup } from "@/lib/gartic-feud";

type Snapshot = { revision: number; state: Game };
const api = "/api/admin/gartic-feud";
const button = "rounded-xl bg-sky-900 px-4 py-2 font-bold text-white hover:bg-sky-700 disabled:opacity-40";
const field = "w-full min-w-0 rounded-lg border border-sky-200 bg-white px-3 py-2 text-slate-900";

async function request(action?: Record<string, unknown>) {
  const response = await fetch(api, action ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action),
  } : { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

export default function Host() {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [draft, setDraft] = useState<Setup>();
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [obs, setObs] = useState("");
  const [editor, setEditor] = useState(0);
  const [now, setNow] = useState(0);
  const game = snapshot?.state;

  function accept(next: Snapshot) {
    setSnapshot(next);
    setDraft({ players: next.state.players, questions: next.state.questions, demo: next.state.demo });
    setDirty(false);
    setNow(Date.now());
  }

  async function refresh() {
    setBusy(true);
    try { accept(await request()); setMessage(""); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  const revision = snapshot?.revision;
  useEffect(() => {
    if (dirty || busy) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function sync() {
      try {
        const next: Snapshot = await request();
        if (cancelled) return;
        if (next.revision !== revision) accept(next);
        setMessage(message => message === "Connection lost. Reconnecting…" ? "" : message);
      } catch (error) {
        if (cancelled) return;
        setMessage(revision === undefined ? (error as Error).message : "Connection lost. Reconnecting…");
      }
      timer = setTimeout(sync, 1500);
    }
    timer = setTimeout(sync, revision === undefined ? 0 : 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [busy, dirty, revision]);
  useEffect(() => {
    if (!game?.wheel || game.phase !== "playing") return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, game.wheel.endsAt - Date.now()) + 25);
    return () => clearTimeout(timer);
  }, [game?.wheel, game?.phase]);

  async function act(type: string, fields: Record<string, unknown> = {}) {
    if (!snapshot || busy) return;
    setBusy(true);
    try {
      const result = await request({ type, revision: snapshot.revision, ...fields });
      if (type === "obs") setObs(location.origin + "/gartic-feud/display#" + result.token);
      else if (type === "audio") setSnapshot(result);
      else accept(result);
      setMessage(type === "setup" ? "Setup saved." : type === "audio" ? "OBS audio updated." : "");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  function edit(next: Setup) { setDraft(next); setDirty(true); }
  function save(event: FormEvent) { event.preventDefault(); void act("setup", { setup: draft }); }

  const spinning = game?.phase === "playing" && game.wheel !== null && now < game.wheel.endsAt;
  const active = game?.phase === "playing" && game.wheel && !spinning
    ? (game.wheel.player + game.attempts) % 4 : null;
  const question = game?.questions[game.question];
  const audio = game?.audio ?? { volume: 65, muted: false };
  const ranking = game?.players.map((name, i) => ({ name, i, score: game.scores[i] }))
    .sort((a, b) => b.score - a.score || a.i - b.i);

  return <main className="space-y-6 p-4 text-sky-950 sm:p-8">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-black">Gartic Feud</h1>
      <div className="flex flex-wrap gap-2">
        <button className={button} disabled={busy || !game} onClick={() => void act("obs")}>Create OBS link</button>
        <button className={button} disabled={busy} onClick={() => {
          if (!dirty || confirm("Discard unsaved changes?")) void refresh();
        }}>Refresh game state</button>
      </div>
    </header>
    {obs && <label className="block">Private OBS link · Valid for 12 hours
      <input className={field} value={obs} readOnly onFocus={event => event.target.select()} />
    </label>}
    <p role="status">{message || (!game ? "Loading the game…" : "")}</p>
    {game && draft && <>
      <form className="flex flex-wrap items-end gap-3 rounded-xl bg-sky-50 p-3" onSubmit={event => {
        event.preventDefault();
        void act("audio", { volume: Number(new FormData(event.currentTarget).get("volume")), muted: audio.muted });
      }}>
        <label className="grid gap-1">OBS volume ({audio.volume}%)
          <input key={audio.volume} name="volume" type="range" min={0} max={100} defaultValue={audio.volume} />
        </label>
        <button className={button} disabled={busy}>Apply volume</button>
        <button className={button} type="button" disabled={busy} aria-pressed={audio.muted}
          onClick={() => void act("audio", { volume: audio.volume, muted: !audio.muted })}>
          {audio.muted ? "Unmute OBS" : "Mute OBS"}
        </button>
      </form>
      {game.demo && <p className="rounded-xl bg-sky-100 p-3 font-bold">Demo · Sample questions</p>}
      {game.phase === "idle" ? <form onSubmit={save} className="space-y-4 rounded-2xl bg-sky-50 p-4">
        <div className="grid gap-3 sm:grid-cols-4">{draft.players.map((name, i) =>
          <label key={i}>Player {i + 1}<input className={field} required maxLength={24} value={name} onChange={event =>
            edit({ ...draft, players: draft.players.map((value, index) => index === i ? event.target.value : value) })} /></label>)}</div>
        <label>Question to edit<select className={field} value={editor} onChange={event => setEditor(Number(event.target.value))}>
          {draft.questions.map((q, i) => <option key={i} value={i}>{i + 1}. {q.text}</option>)}
        </select></label>
        <label>Question text<input className={field} required maxLength={150} value={draft.questions[editor].text} onChange={event =>
          edit({ ...draft, questions: draft.questions.map((q, i) => i === editor ? { ...q, text: event.target.value } : q) })} /></label>
        <div className="grid gap-2 sm:grid-cols-2">{draft.questions[editor].answers.map((answer, i) =>
          <div className="grid grid-cols-[1fr_5rem] gap-2" key={i}>
            <label>Answer {i + 1}<input className={field} required maxLength={70} value={answer.text} onChange={event => {
              const text = event.target.value;
              edit({ ...draft, questions: draft.questions.map((q, j) => j === editor
                ? { ...q, answers: q.answers.map((a, k) => k === i ? { ...a, text } : a) } : q) });
            }} /></label>
            <label>Points<input className={field} type="number" required min={0} max={999} value={Number.isNaN(answer.points) ? "" : answer.points}
              onChange={event => {
                const points = event.target.valueAsNumber;
                edit({ ...draft, questions: draft.questions.map((q, j) => j === editor
                  ? { ...q, answers: q.answers.map((a, k) => k === i ? { ...a, points } : a) } : q) });
              }} /></label>
          </div>)}</div>
        <label className="flex gap-2"><input type="checkbox" checked={draft.demo} onChange={event => edit({ ...draft, demo: event.target.checked })} />
          Mark as demo</label>
        <div className="flex flex-wrap gap-2">
          <button className={button} disabled={busy || !dirty}>Save setup</button>
          <button className={button} type="button" disabled={busy || dirty} onClick={() => void act("start")}>Start and show question 1</button>
        </div>
      </form> : <>
        {game.phase === "final" ? <section className="rounded-2xl bg-sky-100 p-4">
          <h2 className="text-xl font-black">Final standings</h2>
          <ol>{ranking?.map(({ name, i, score }) => <li key={i}>#{ranking.findIndex(player => player.score === score) + 1} {name} · {score} pts</li>)}</ol>
        </section> : <section className="space-y-3 rounded-2xl bg-sky-50 p-4">
          <h2 className="text-xl font-black">Question {game.question + 1}/12 · {question?.text}</h2>
          <p>{game.attempts}/8 attempts · {spinning ? "Wheel spinning…" : active !== null
            ? `Turn: ${game.players[active]}` : game.phase === "revealed" ? "Question complete" : "Waiting for the wheel"}</p>
          {game.wheel && !spinning && <p>First player · {game.players[game.wheel.player]}</p>}
          <div className="grid gap-2 sm:grid-cols-2">{question?.answers.map((answer, i) => <button className={button} key={i}
            disabled={busy || active === null || game.hits.includes(i)} onClick={() => void act("hit", { answer: i })}>
            {i + 1}. {answer.text} · {answer.points} pts {game.hits.includes(i) && "✓"}
          </button>)}</div>
          <div className="flex flex-wrap gap-2">
            {game.phase === "ready" && <button className={button} disabled={busy} onClick={() => void act("spin")}>Spin the wheel</button>}
            {game.phase === "playing" && <button className={button} disabled={busy || active === null} onClick={() => void act("miss")}>Wrong answer</button>}
            {game.phase !== "revealed"
              ? <button className={button} disabled={busy || spinning} onClick={() => void act("reveal")}>Reveal All</button>
              : <button className={button} disabled={busy} onClick={() => void act("next")}>{game.question === 11 ? "Show final standings" : "Next question"}</button>}
          </div>
        </section>}
        <section className="grid gap-3 sm:grid-cols-4">{game.players.map((name, player) => <form className="rounded-xl bg-sky-50 p-3"
          key={player} onSubmit={event => {
            event.preventDefault();
            void act("score", { player, score: Number(new FormData(event.currentTarget).get("score")) });
          }}>
          <label>{player + 1}. {name}<input className={field} key={game.scores[player]} name="score" required type="number" min={0} max={999999} defaultValue={game.scores[player]} /></label>
          <button className={button} disabled={busy}>Update score</button>
        </form>)}</section>
        <button className={button} disabled={busy} onClick={() => {
          const confirmation = prompt("Type Reset to clear scores and progress.");
          if (confirmation === "Reset") void act("reset", { confirmation });
        }}>Reset game</button>
      </>}
    </>}
  </main>;
}
