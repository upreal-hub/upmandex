import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { effectsScript } from "../app/gartic-feud/display/effects";
import { activePlayer, demoSetup, displayView, move, newGame, upgradeDemo } from "./gartic-feud";

type DisplayElement = {
  hidden: boolean;
  textContent: string;
  children: DisplayElement[];
  animate: (frames: unknown, options: { duration: number }) => { finished: Promise<void>; cancel: () => void };
  addEventListener: () => void;
  querySelector: (selector: string) => DisplayElement;
};

test("audiovisual cues record actual moves without changing scoring or exposing hidden options", () => {
  const ready = move(newGame(), { type: "start" });
  let game = move(ready, { type: "spin" }, 1000, () => 0);
  const spinning = displayView(game, 3999);
  assert.equal(spinning.wheelWinner, null);
  assert.equal(JSON.stringify(spinning).includes(demoSetup().questions[0].answers[0].text), false);
  game = move(game, { type: "miss" }, 4000);
  assert.deepEqual(game.scores, [0, 0, 0, 0]);
  assert.equal(activePlayer(game, 4000), 1);
  game = move(game, { type: "hit", answer: 0 }, 4100);
  const hit = game.events?.at(-1);
  assert.deepEqual(hit, { kind: "hit", id: 4, at: 4100, question: 0, player: 1, points: 40, score: 40, answer: 0, end: false });
  assert.deepEqual(displayView(game).answers.slice(1), Array(7).fill(null));
  for (let i = 0; i < 6; i++) game = move(game, { type: "miss" }, 4200 + i);
  assert.equal(displayView(game).answers.filter(Boolean).length, 8);
  assert.deepEqual(game.scores, [0, 40, 0, 0]);
  const ending = game.events?.at(-1);
  assert.equal(ending?.kind, "miss");
  assert.equal(ending?.kind === "miss" && ending.end, true);
  assert.throws(() => move(game, { type: "audio", volume: 101, muted: false }));
  game = move(game, { type: "audio", volume: 30, muted: true });
  const reset = move(game, { type: "reset", confirmation: "Reset" });
  assert.deepEqual(displayView(reset).audio, { volume: 30, muted: true });
  assert.deepEqual(reset.events?.map(event => event.kind), ["reset"]);
  assert.ok(reset.events![0].id > game.events!.at(-1)!.id);
});

test("demo upgrade recognizes the complete untouched V1 deck and preserves edited questions", () => {
  const original = newGame();
  const themes = ["Dessins impossibles", "Mauvaises excuses", "Objets minuscules", "Animaux pressés",
    "Couleurs bizarres", "Personnages sans tête", "Dessins à la souris", "Mots trop longs",
    "Indices absurdes", "Scènes de plage", "Surprises du chat", "Gribouillis de fin"];
  original.questions = themes.map(theme => ({ text: `[DÉMO] Gartic · ${theme} ?`,
    answers: Array.from({ length: 8 }, (_, i) => ({ text: `${theme} · exemple ${i + 1}`, points: (8 - i) * 5 })) }));
  original.players[0] = "Custom host";
  assert.deepEqual(upgradeDemo(original).questions, demoSetup().questions);
  assert.deepEqual(upgradeDemo(original).players, original.players);
  original.questions[11].answers[7].points = 18;
  assert.equal(upgradeDemo(original), original);
});

test("OBS queues visual and audio cues once, animates the score, and resumes silently after refresh or disconnect", () => {
  const sounds: number[] = [];
  const visuals: [string, number][] = [];
  const elements = new Map<string, DisplayElement>();
  const timers = new Map<number, () => void>();
  const intervals = new Map<number, () => void>();
  const frames = new Map<number, (time: number) => void>();
  let nextId = 0;
  let time = 0;
  function element(id: string): DisplayElement {
    return { hidden: true, textContent: "", children: [],
      animate: (_: unknown, options: { duration: number }) => {
        visuals.push([id, options.duration]);
        return { finished: Promise.resolve(), cancel() {} };
      },
      addEventListener() {},
      querySelector: (selector: string) => byId(id + selector),
    };
  }
  function byId(id: string): DisplayElement {
    const existing = elements.get(id);
    if (existing) return existing;
    const created = element(id);
    elements.set(id, created);
    return created;
  }
  byId("tiles").children = Array.from({ length: 8 }, (_, i) => byId("tile" + i));
  class AudioContext {
    state = "running"; currentTime = 0; destination = {};
    resume = async () => {};
    createGain = () => ({ connect() {}, disconnect() {}, gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} } });
    createOscillator = () => ({ connect() {}, start() {}, stop() {},
      frequency: { setValueAtTime(value: number) { sounds.push(value); }, exponentialRampToValueAtTime() {} } });
  }
  const api = runInNewContext(`
    let previous;
    ${effectsScript}
    ({
      push(state) { collectEffects(state); previous = state; playPending(); },
      disconnect() { clearEffects(); cursor = null; },
    })
  `, {
    byId, AudioContext, matchMedia: () => ({ matches: false }), performance: { now: () => time },
    setTimeout: (fn: () => void) => (timers.set(++nextId, fn), nextId),
    clearTimeout: (id: number) => timers.delete(id),
    setInterval: (fn: () => void) => (intervals.set(++nextId, fn), nextId),
    clearInterval: (id: number) => intervals.delete(id),
    requestAnimationFrame: (fn: (time: number) => void) => (frames.set(++nextId, fn), nextId),
    cancelAnimationFrame: (id: number) => frames.delete(id),
  });
  const advance = () => {
    const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn());
  };
  const frame = (at: number) => {
    time = at;
    const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time));
  };
  let game = newGame();
  byId("burst").children = Array.from({ length: 8 }, (_, i) => byId("spark" + i));
  api.push(displayView(game, 90));
  assert.equal(sounds.length, 0);
  game = move(game, { type: "start" }, 100);
  api.push(displayView(game, 100));
  assert.ok(visuals.some(([target, duration]) => target === "show-card" && duration === 1420));
  assert.ok(sounds.includes(392));
  const introductionCount = visuals.length;
  api.push(displayView(game, 200));
  assert.equal(visuals.length, introductionCount);
  advance();
  api.disconnect();
  api.push(displayView(game, 300));
  assert.equal(visuals.length, introductionCount);
  game = move(game, { type: "spin" }, 1000, () => 0);
  api.push(displayView(game, 1001));
  assert.equal(intervals.size, 1);
  assert.ok(sounds.includes(285));
  api.push(displayView(game, 4000));
  assert.equal(intervals.size, 0);
  assert.ok(sounds.includes(960));
  game = move(game, { type: "miss" }, 4100);
  game = move(game, { type: "hit", answer: 0 }, 4200);
  api.push(displayView(game, 4250));
  assert.ok(visuals.some(([target, duration]) => target === "wrong" && duration === 1250));
  api.push(displayView(game, 4400));
  assert.equal(sounds.filter(pitch => pitch === 145).length, 1);
  advance();
  assert.ok(visuals.some(([target]) => target === "tile0"));
  assert.equal(byId("player1.award").textContent, "+40 pts");
  frame(325);
  assert.equal(byId("player1.score").textContent, "20 pts");
  frame(650);
  assert.equal(byId("player1.score").textContent, "40 pts");
  advance();
  api.disconnect();
  const soundCount = sounds.length;
  const visualCount = visuals.length;
  api.push(displayView(game, 4500));
  assert.equal(sounds.length, soundCount);
  assert.equal(visuals.length, visualCount);
  game = move(game, { type: "audio", muted: true, volume: 80 });
  game = move(game, { type: "reveal" }, 5000);
  api.push(displayView(game, 5000));
  assert.equal(sounds.length, soundCount);
  advance();
  game = move(game, { type: "audio", muted: false, volume: 80 });
  game = move(game, { type: "next" }, 5100);
  game = move(game, { type: "reveal" }, 5200);
  api.push(displayView(game, 5200));
  advance();
  assert.ok(sounds.includes(380) && sounds.includes(590));
  assert.ok(visuals.some(([target]) => target === "round-note"));
  game = move({ ...game, question: 11 }, { type: "next" }, 5300);
  api.push(displayView(game, 5300));
  assert.ok(sounds.includes(1047));
  assert.ok(visuals.some(([target]) => target === "winners"));
});

test("the display renders long wheel names, the server winner, progressive reveals and tied winners", async () => {
  const { GET } = await import("../app/gartic-feud/display/route");
  const html = await GET().text();
  const script = html.match(/<script[^>]*>([\s\S]+)<\/script>/)![1];
  type FakeElement = {
    hidden: boolean; textContent: string; className: string; children: FakeElement[];
    firstElementChild: { textContent: string }; parentElement: FakeElement | null;
    style: { transform: string };
    addEventListener: () => void;
    animate: () => { finished: Promise<void>; cancel: () => void };
    classList: {
      add: (name: string) => void; remove: (name: string) => void;
      contains: (name: string) => boolean; toggle: (name: string, enabled: boolean) => void;
    };
    querySelector: () => { textContent: string };
    append: (...children: FakeElement[]) => void;
    replaceChildren: (...children: FakeElement[]) => void;
    replaceWith: (child: FakeElement) => void;
  };
  function makeElement(): FakeElement {
    const classes = new Set<string>();
    return {
      hidden: false, textContent: "", className: "", children: [] as FakeElement[],
      firstElementChild: { textContent: "" }, parentElement: null as FakeElement | null,
      style: { transform: "" },
      addEventListener() {},
      animate: () => ({ finished: Promise.resolve(), cancel() {} }),
      classList: {
        add: (name: string) => classes.add(name),
        remove: (name: string) => classes.delete(name),
        contains: (name: string) => classes.has(name),
        toggle: (name: string, enabled: boolean) => enabled ? classes.add(name) : classes.delete(name),
      },
      querySelector: () => ({ textContent: "" }),
      append(...children: FakeElement[]) {
        children.forEach(child => { child.parentElement = this; this.children.push(child); });
      },
      replaceChildren(...children: FakeElement[]) { this.children = []; this.append(...children); },
      replaceWith(child: FakeElement) {
        const parent = this.parentElement;
        if (!parent) throw new Error("Missing parent");
        parent.children[parent.children.indexOf(this)] = child;
        child.parentElement = parent;
      },
    };
  }
  const elements = new Map<string, FakeElement>();
  const find = (id: string) => {
    if (!elements.has(id)) elements.set(id, makeElement());
    return elements.get(id)!;
  };
  for (let i = 0; i < 4; i++) makeElement().append(find("wheel-name" + i));
  const document = { getElementById: find, createElement: makeElement, documentElement: { dataset: {} } };
  const api = runInNewContext(script + "\n({render, reducedMotion})", {
    document, location: { search: "?motion=off", hash: "" }, URLSearchParams,
    sessionStorage: { getItem: () => null }, matchMedia: () => ({ matches: false }),
    getComputedStyle: () => ({ transform: "none" }), clearTimeout() {}, setTimeout() {},
  });
  assert.equal(api.reducedMotion(), true);
  const setup = demoSetup();
  setup.players[2] = "A Very Long Streamer";
  let game = move(newGame(setup), { type: "start" }, 100);
  api.render(displayView(game, 100), true, game.events);
  assert.ok(find("tiles").children.every(tile => tile.classList.contains("is-entering")));
  game = move(game, { type: "spin" }, 200, () => 2);
  api.render(displayView(game, 201), true, game.events?.slice(-1));
  assert.equal(find("wheel-name2").textContent, setup.players[2]);
  assert.ok(find("wheel-name2").parentElement?.classList.contains("long"));
  assert.equal(find("wheel").hidden, false);
  api.render(displayView(game, 3200), true, []);
  assert.equal(find("disc").style.transform, "rotate(-180deg)");
  assert.equal(find("roulette-result").textContent, "First player: 3 · A Very Long Streamer");
  game = move(game, { type: "reveal" }, 3300);
  api.render(displayView(game, 3300), true, game.events?.slice(-1));
  assert.ok(find("tiles").children.every(tile => tile.classList.contains("reveal-wave")));
  game = move({ ...game, question: 11, scores: [90, 20, 90, 15] }, { type: "next" }, 3500);
  api.render(displayView(game, 3500), true, game.events?.slice(-1));
  assert.equal(find("winners").textContent, "Joint winners: Streamer 1 & A Very Long Streamer");
  assert.deepEqual(find("rank").children.map(row => row.textContent.split(" ")[0]), ["#1", "#1", "#3", "#4"]);
});
