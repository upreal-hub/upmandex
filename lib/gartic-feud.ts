import { randomInt } from "node:crypto";

export type Answer = { text: string; points: number };
export type Question = { text: string; answers: Answer[] };
export type Setup = { players: string[]; questions: Question[]; demo: boolean };
type Phase = "idle" | "ready" | "playing" | "revealed" | "final";
export type AudioSettings = { volume: number; muted: boolean };
const defaultAudio: AudioSettings = { volume: 65, muted: false };
type Cue = { kind: "start" | "question" | "spin" | "finish" | "reset" | "reveal" }
  | { kind: "miss"; end: boolean }
  | { kind: "hit"; end: boolean; answer: number; player: number; points: number; score: number };
type GameEvent = Cue & { id: number; at: number; question: number };
export type Game = Setup & {
  phase: Phase; question: number; scores: number[]; attempts: number;
  hits: number[]; wheel: { player: number; endsAt: number } | null;
  audio?: AudioSettings; events?: GameEvent[];
};

function record(game: Game, cue: Cue, at: number): Game {
  const events = game.events ?? [];
  const id = (events.at(-1)?.id ?? 0) + 1;
  return { ...game, events: [...(cue.kind === "reset" ? [] : events.slice(-31)), { ...cue, id, at, question: game.question }] };
}

export class InvalidMove extends Error {}
const requireMove = (ok: unknown, message: string) => {
  if (!ok) throw new InvalidMove(message);
};
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? value as Record<string, unknown> : {};
const text = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const integer = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;

export function demoSetup(): Setup {
  return {
    demo: true,
    players: Array.from({ length: 4 }, (_, i) => `Streamer ${i + 1}`),
    questions: ["Impossible drawings", "Bad excuses", "Tiny objects", "Animals in a hurry",
      "Unusual colors", "Headless characters", "Drawing with a mouse", "Long words",
      "Absurd clues", "Beach scenes", "Chat surprises", "Last-minute doodles"].map((theme) => ({
      text: `[DEMO] Gartic · ${theme}?`,
      answers: Array.from({ length: 8 }, (_, i) => ({ text: `${theme} · example ${i + 1}`, points: (8 - i) * 5 })),
    })),
  };
}

export function upgradeDemo(game: Game): Game {
  if (!game.demo || game.questions.length !== 12) return game;
  const originalThemes = ["Dessins impossibles", "Mauvaises excuses", "Objets minuscules", "Animaux pressés",
    "Couleurs bizarres", "Personnages sans tête", "Dessins à la souris", "Mots trop longs",
    "Indices absurdes", "Scènes de plage", "Surprises du chat", "Gribouillis de fin"];
  const untouched = game.questions.every((question, i) =>
    question.text === `[DÉMO] Gartic · ${originalThemes[i]} ?` && question.answers.length === 8 &&
    question.answers.every((answer, j) =>
      answer.text === `${originalThemes[i]} · exemple ${j + 1}` && answer.points === (8 - j) * 5));
  return untouched ? { ...game, questions: demoSetup().questions } : game;
}

export function newGame(setup: Setup = demoSetup()): Game {
  return { ...setup, phase: "idle", question: 0, scores: [0, 0, 0, 0], attempts: 0, hits: [], wheel: null };
}

function parseSetup(input: unknown): Setup {
  const { players, questions, demo } = object(input);
  if (!Array.isArray(players) || players.length !== 4 || !players.every(p => text(p, 24)) ||
      !Array.isArray(questions) || questions.length !== 12 || typeof demo !== "boolean") {
    throw new InvalidMove("Provide four player names, twelve questions, and a demo setting.");
  }
  return { demo, players: players.map(p => p.trim()), questions: questions.map(input => {
    const { text: prompt, answers } = object(input);
    if (!text(prompt, 150) || !Array.isArray(answers) || answers.length !== 8) {
      throw new InvalidMove("Each question must have exactly eight answers.");
    }
    return { text: prompt.trim(), answers: answers.map(input => {
      const { text: label, points } = object(input);
      if (!text(label, 70) || !integer(points, 0, 999)) throw new InvalidMove("Invalid answer or points (0–999).");
      return { text: label.trim(), points };
    }) };
  }) };
}

export function activePlayer(game: Game, now = Date.now()) {
  return game.phase === "playing" && game.wheel && now >= game.wheel.endsAt
    ? (game.wheel.player + game.attempts) % 4 : null;
}

export function move(game: Game, input: unknown, now = Date.now(), pick = () => randomInt(4)): Game {
  const action = object(input);
  switch (action.type) {
    case "setup":
      requireMove(game.phase === "idle", "Reset the game before editing the setup.");
      return { ...newGame(parseSetup(action.setup)), audio: game.audio, events: game.events };
    case "start":
      requireMove(game.phase === "idle", "The game has already started.");
      return record({ ...game, phase: "ready" }, { kind: "start" }, now);
    case "spin":
      requireMove(game.phase === "ready", "The wheel has already been spun.");
      return record({ ...game, phase: "playing", wheel: { player: pick(), endsAt: now + 3000 } }, { kind: "spin" }, now);
    case "hit":
    case "miss": {
      const player = activePlayer(game, now);
      if (player === null) throw new InvalidMove("No player is active.");
      const { answer } = action;
      const hits = [...game.hits];
      const scores = [...game.scores];
      const attempts = game.attempts + 1;
      const end = attempts === 8;
      let cue: Cue = { kind: "miss", end };
      if (action.type === "hit") {
        if (!integer(answer, 0, 7) || hits.includes(answer)) throw new InvalidMove("That answer is unavailable.");
        hits.push(answer);
        const points = game.questions[game.question].answers[answer].points;
        scores[player] += points;
        cue = { kind: "hit", end, answer, player, points, score: scores[player] };
      }
      return record({ ...game, scores, hits, attempts, phase: end ? "revealed" : "playing" }, cue, now);
    }
    case "reveal":
      requireMove(game.phase === "ready" || game.phase === "playing", "That question is unavailable.");
      return record({ ...game, phase: "revealed" }, { kind: "reveal" }, now);
    case "next":
      requireMove(game.phase === "revealed", "Finish the current question first.");
      return game.question === 11 ? record({ ...game, phase: "final" }, { kind: "finish" }, now)
        : record({ ...game, phase: "ready", question: game.question + 1, attempts: 0, hits: [], wheel: null },
          { kind: "question" }, now);
    case "score": {
      const { player, score } = action;
      if (!integer(player, 0, 3) || !integer(score, 0, 999999)) throw new InvalidMove("Invalid score.");
      return { ...game, scores: game.scores.map((value, index) => index === player ? score : value) };
    }
    case "audio": {
      const { volume, muted } = action;
      if (!integer(volume, 0, 100) || typeof muted !== "boolean") throw new InvalidMove("Invalid audio settings.");
      return { ...game, audio: { volume, muted } };
    }
    case "reset":
      requireMove(action.confirmation === "Reset" || action.confirmation === "Réinitialiser", "Confirmation required.");
      return record({ ...newGame({ players: game.players, questions: game.questions, demo: game.demo }),
        audio: game.audio, events: game.events }, { kind: "reset" }, now);
    default:
      throw new InvalidMove("Unknown command.");
  }
}

export function displayView(game: Game, now = Date.now()) {
  const question = game.phase === "idle" || game.phase === "final" ? null : game.questions[game.question];
  const spinning = game.phase === "playing" && game.wheel !== null && now < game.wheel.endsAt;
  return {
    demo: game.demo, phase: game.phase, number: game.question + 1, prompt: question?.text ?? null,
    players: game.players.map((name, i) => ({ name, number: i + 1, score: game.scores[i] })),
    answers: question?.answers.map(({ text, points }, i) =>
      game.hits.includes(i) || game.phase === "revealed" ? { text, points } : null) ?? [],
    attemptsLeft: game.phase === "revealed" || game.phase === "final" ? 0 : 8 - game.attempts,
    active: activePlayer(game, now), spinning,
    wheelWinner: spinning ? null : game.wheel?.player ?? null,
    audio: game.audio ?? defaultAudio, events: game.events ?? [], serverTime: now,
  };
}
