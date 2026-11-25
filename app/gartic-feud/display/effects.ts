export const effectsScript = `
let context;
let master;
let triedAutoplay = false;
let settings = { volume: 0, muted: true };
let current;
let effectTimer;
let queue = [];
let cursor = null;
let wheelTimer;
let liveWheel = false;
const animations = new Set();
const scoreAnimations = new Map();

function syncVolume() {
  if (master) master.gain.value = settings.muted ? 0 : settings.volume / 100;
}

async function enableAudio() {
  try {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.connect(context.destination);
      syncVolume();
    }
    byId("enable-audio").hidden = context.state === "running";
    await context.resume();
    byId("enable-audio").hidden = context.state === "running";
  } catch {
    byId("enable-audio").hidden = false;
  }
}

function sound(notes, offset = 0) {
  if (settings.muted || settings.volume === 0) return;
  if (!context || context.state !== "running") {
    if (!triedAutoplay) { triedAutoplay = true; void enableAudio(); }
    if (!context || context.state !== "running") return;
  }
  const start = context.currentTime + offset;
  for (const [pitch, delay, duration, type = "sine", finish = pitch] of notes) {
    const tone = context.createOscillator();
    const envelope = context.createGain();
    const at = start + delay;
    tone.type = type;
    tone.frequency.setValueAtTime(pitch, at);
    tone.frequency.exponentialRampToValueAtTime(finish, at + duration);
    envelope.gain.setValueAtTime(.001, at);
    envelope.gain.exponentialRampToValueAtTime(.22, at + .012);
    envelope.gain.exponentialRampToValueAtTime(.001, at + duration);
    tone.connect(envelope);
    envelope.connect(master);
    tone.start(at);
    tone.stop(at + duration);
  }
}

const cues = {
  intro: [[392, 0, .27, "triangle"], [523, .12, .3], [659, .24, .34], [784, .36, .36],
    [1047, .49, .57], [523, .49, .48, "triangle"]],
  wrong: [[145, 0, .52, "sawtooth", 83], [106, .07, .4, "square", 72]],
  right: [[660, 0, .19], [880, .095, .23], [1109, .205, .32]],
  tick: [[285, 0, .054, "triangle", 140]],
  stop: [[480, 0, .21, "triangle"], [960, .13, .3, "triangle"]],
  reveal: [[380, 0, .16], [510, .1, .16], [680, .2, .2]],
  end: [[590, 0, .23], [430, .16, .33]],
  finish: [[392, 0, .22], [523, .14, .25], [659, .27, .28], [784, .39, .35], [1047, .54, .55], [659, .54, .36]],
};

function reducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches ||
    (typeof document !== "undefined" && document.documentElement.dataset.motion === "off");
}

function animate(element, frames, duration) {
  if (!element) return;
  if (reducedMotion()) {
    const { transform: _transform, offset: _offset, ...frame } = frames[frames.length > 2 ? 1 : 0];
    frames = [frame, frame];
  }
  const animation = element.animate(frames, { duration, easing: "ease-out" });
  animations.add(animation);
  animation.finished.catch(() => {}).finally(() => animations.delete(animation));
}

function writeScore(player, score) {
  byId("player" + player).querySelector(".score").textContent = score + " pts";
}

function countScore(event) {
  const { player, points, score } = event;
  const box = byId("player" + player);
  animate(box, [
    { boxShadow: "0 0 35px #4bfdac", borderColor: "#a3ffd0" },
    { boxShadow: "0 0 0 transparent" },
  ], 900);
  const amount = box.querySelector(".award");
  amount.textContent = "+" + points + " pts";
  animate(amount, [
    { opacity: 1, transform: "translateY(0)" },
    { opacity: 1, transform: "translateY(-12px)", offset: .35 },
    { opacity: 0, transform: "translateY(-42px)" },
  ], 1100);
  const start = performance.now();
  const count = now => {
    const progress = Math.min(1, (now - start) / 650);
    writeScore(player, score - Math.round(points * (1 - progress)));
    if (progress < 1) scoreAnimations.set(player, requestAnimationFrame(count));
    else scoreAnimations.delete(player);
  };
  writeScore(player, score - points);
  if (reducedMotion()) writeScore(player, score);
  else scoreAnimations.set(player, requestAnimationFrame(count));
}

function burst(radius = 155) {
  if (reducedMotion()) return;
  Array.from(byId("burst").children).forEach((particle, i) => {
    const angle = i * Math.PI / 4;
    const distance = radius * (i % 2 ? .75 : 1);
    const destination = "translate(" + Math.round(Math.cos(angle) * distance) + "px," +
      Math.round(Math.sin(angle) * distance) + "px) rotate(70deg)";
    animate(particle, [{ opacity: 0, transform: "scale(.4)" },
      { opacity: .9, offset: .23 }, { opacity: 0, transform: destination }], 840 + i * 28);
  });
}

function applyCue(event) {
  const board = byId("board");
  if (event.kind === "start") {
    animate(byId("show-card"), [
      { opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "scale(1)", offset: .18 },
      { opacity: 1, offset: .52 }, { opacity: 0, transform: "scale(1.02)" },
    ], 1420);
    burst(185);
    sound(cues.intro);
    return 1420;
  } else if (event.kind === "question") {
    animate(board, [{ boxShadow: "0 0 48px #64c6ff80" }, { boxShadow: "0 0 35px #327bd975" }], 650);
    return 650;
  } else if (event.kind === "miss") {
    const feedback = byId("wrong");
    animate(feedback, [{ opacity: 0, transform: "scale(.65)" }, { opacity: 1, transform: "scale(1.06)", offset: .16 },
      { opacity: 1, transform: "scale(1)", offset: .62 }, { opacity: 0, transform: "scale(.94)" }], 1250);
    animate(board, [{ boxShadow: "0 0 70px #ff334a", backgroundColor: "#6d1837" }, { boxShadow: "0 0 35px #327bd975" }], 750);
    sound(cues.wrong);
  } else if (event.kind === "hit") {
    const tile = byId("tiles").children[event.answer];
    animate(tile, [{ background: "#118d58", boxShadow: "0 0 28px #4bffa8" }, { background: "linear-gradient(110deg,#1276d3,#2055b5)" }], 1050);
    countScore(event);
    sound(cues.right);
  } else if (event.kind === "reveal") {
    sound(cues.reveal);
  } else if (event.kind === "finish") {
    burst(235);
    animate(byId("winners"), [{ textShadow: "0 0 36px white" }, { textShadow: "0 0 22px #329aff" }], 1100);
    sound(cues.finish);
  }
  if (event.end || event.kind === "reveal") {
    animate(byId("round-note"), [
      { opacity: 0, offset: 0 }, { opacity: 0, offset: .36 },
      { opacity: 1, offset: .54 }, { opacity: 1, offset: .85 }, { opacity: 0 },
    ], 1450);
    if (event.kind !== "reveal") sound(cues.reveal, .77);
    sound(cues.end, event.kind === "reveal" ? .46 : 1.2);
  }
  return event.end ? 1750 : event.kind === "miss" ? 1300 : 1120;
}

function busyScore(player) {
  return scoreAnimations.has(player) ||
    [current, ...queue].some(event => event?.kind === "hit" && event.player === player);
}

function stopWheel() {
  clearInterval(wheelTimer);
  liveWheel = false;
}

function clearEffects() {
  stopWheel();
  clearTimeout(effectTimer);
  current = undefined;
  queue = [];
  for (const animation of animations) animation.cancel();
  animations.clear();
  for (const frame of scoreAnimations.values()) cancelAnimationFrame(frame);
  scoreAnimations.clear();
  stopSound();
}

function stopSound() {
  if (!master) return;
  master.disconnect();
  master = context.createGain();
  master.connect(context.destination);
  syncVolume();
}

function playPending() {
  if (current || !previous) return;
  current = queue.shift();
  if (!current) {
    previous.players.forEach((player, i) => writeScore(i, player.score));
    return;
  }
  if (current.question !== previous.number - 1 || (previous.phase === "final" && current.kind !== "finish")) {
    current = undefined;
    playPending();
    return;
  }
  effectTimer = setTimeout(() => {
    current = undefined;
    playPending();
  }, applyCue(current));
}

// Keep a cursor per display instance. A fresh document or a recovered connection starts silently.
function collectEffects(state) {
  settings = state.audio ?? settings;
  syncVolume();
  const events = state.events ?? [];
  const latest = events.at(-1)?.id ?? 0;
  const fresh = cursor === null ? [] : events.filter(event =>
    event.id > cursor && state.serverTime - event.at <= 4500);
  cursor = latest;
  if (fresh.some(event => event.kind === "reset") || (previous && previous.number !== state.number)) clearEffects();
  const spin = fresh.find(event => event.kind === "spin" && event.question === state.number - 1);
  if (spin && state.spinning && !liveWheel) {
    liveWheel = true;
    sound(cues.tick);
    wheelTimer = setInterval(() => sound(cues.tick), 145);
  }
  if (!state.spinning && (liveWheel || spin)) {
    stopWheel();
    if (state.wheelWinner !== null) sound(cues.stop);
  }
  queue.push(...fresh.filter(event => event.kind !== "spin" && event.kind !== "reset" && event.question === state.number - 1));
  return fresh;
}

byId("enable-audio").addEventListener("click", () => void enableAudio());
`;
