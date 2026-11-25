import { randomBytes } from "node:crypto";
import { effectsScript } from "./effects";
import { ambienceMarkup, stageMarkup, stageStyles } from "./stage";

const styles = `
*{box-sizing:border-box}
body{margin:0;min-height:100dvh;color:#fff;font:700 clamp(13px,1.25vw,27px)/1.25 system-ui,sans-serif;background:
radial-gradient(ellipse at 50% 0%,#1149a4,transparent 52%),
radial-gradient(ellipse at 8% 92%,#1c5cb9,transparent 34%),
radial-gradient(ellipse at 92% 92%,#164d9a,transparent 34%),#061632}
body::before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse 30% 17% at 15% 100%,#77ccff54,transparent),radial-gradient(ellipse 40% 14% at 80% 102%,#b3e2ff58,transparent);filter:blur(14px)}
main{position:relative;min-height:100dvh;display:grid;align-content:center;gap:clamp(12px,2vh,26px);padding:clamp(12px,2vw,45px)}
header{text-align:center}h1,h2,p{margin:0}header p{color:#bce5ff}h1{font-size:clamp(25px,3.2vw,68px);text-shadow:0 0 24px #509eff}
#stage{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,3.4fr) minmax(0,1fr);gap:clamp(8px,1.3vw,28px);align-items:stretch}
.side{display:grid;grid-template-rows:1fr 1fr;gap:12px}
.player{position:relative;display:flex;flex-direction:column;justify-content:flex-end;gap:4px;min-height:clamp(95px,22vh,300px);padding:10px;border:1px dashed #7bbaf580;border-radius:16px;text-align:center;color:#d0edff;overflow-wrap:anywhere}
.player strong{font-size:1.1em;color:white}
.award{position:absolute;bottom:24%;left:0;right:0;z-index:1;opacity:0;color:#baffd8;text-shadow:0 0 14px #19e786,0 2px 8px #022419;pointer-events:none;font-size:1.35em}
.player.active{border:2px solid #c5f0ff;box-shadow:0 0 26px #319bff;background:linear-gradient(transparent 40%,#1669d974)}
#board{position:relative;display:grid;align-content:center;gap:14px;padding:clamp(12px,1.7vw,35px);border:2px solid #45a8ff;border-radius:24px;background:#071b3eef;box-shadow:0 0 35px #327bd975, inset 0 0 34px #2b69a550}
#prompt{font-size:clamp(17px,2.05vw,45px);text-align:center;overflow-wrap:anywhere}
#tiles{display:grid;gap:clamp(4px,.65vh,10px)}
.tile{display:grid;grid-template-columns:2ch 1fr auto;align-items:center;gap:10px;min-height:clamp(26px,4.5vh,49px);padding:5px 10px;border-radius:10px;background:linear-gradient(110deg,#1b64b6,#0e3d84)}
.tile span:nth-child(2){overflow-wrap:anywhere}.tile strong{color:#b5e9ff}.tile.open{background:linear-gradient(110deg,#1276d3,#2055b5)}.tile.revealing{animation:reveal .38s ease-out}
#status{text-align:center;min-height:1.25em;color:#bae3ff}#demo{color:#fff;text-align:center;font-size:.75em}
#wrong{position:absolute;inset:0;display:grid;place-items:center;z-index:3;pointer-events:none;opacity:0;color:#ff304a;font-size:clamp(105px,18vw,325px);line-height:1;text-shadow:0 0 44px #f9002e,0 3px 20px #440013}
#enable-audio{justify-self:center;padding:6px 12px;border:1px solid #b5e9ff;border-radius:8px;background:#103c7e;color:white;font:inherit;font-size:.68em}
#rank{list-style:none;padding:0;margin:0;display:grid;gap:9px}#rank li{padding:10px;border-radius:10px;background:#174a99;overflow-wrap:anywhere}#rank.celebrate li{animation:reveal .65s both}
#rank li:nth-child(2){animation-delay:.1s}#rank li:nth-child(3){animation-delay:.2s}#rank li:nth-child(4){animation-delay:.3s}
[hidden]{display:none!important}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes reveal{from{opacity:.25;transform:translateY(7px) scale(.98)}to{opacity:1;transform:none}}
@media(max-width:650px) and (orientation:portrait){#stage{display:flex;flex-direction:column;gap:8px}.side{grid-template:1fr / 1fr 1fr}.player{min-height:48px;padding:5px}#board{gap:8px}main{align-content:start}}
@media(prefers-reduced-motion:reduce){*,*::before{animation-duration:.01ms!important;animation-iteration-count:1!important}}
${stageStyles}
`;

const script = `
const byId = id => document.getElementById(id);
const status = byId("status");
if (new URLSearchParams(location.search).get("motion") === "off") document.documentElement.dataset.motion = "off";
let token = location.hash.slice(1);
try {
  if (token) sessionStorage.setItem("gartic-feud-token", token);
  else token = sessionStorage.getItem("gartic-feud-token") || "";
} catch {}
let previous;
let wheelFade;
${effectsScript}
function node(tag, text) {
  const item = document.createElement(tag);
  item.textContent = text;
  return item;
}
function hideWheel() {
  clearTimeout(wheelFade);
  byId("wheel").hidden = true;
  byId("disc").classList.remove("spinning");
}
function renderWheel(state, live, fresh) {
  const wheel = byId("wheel");
  const disc = byId("disc");
  const result = byId("roulette-result");
  if (state.spinning) {
    clearTimeout(wheelFade);
    disc.style.transform = "";
    disc.classList.add("spinning");
    result.hidden = true;
    wheel.hidden = false;
    return;
  }
  const winner = state.wheelWinner;
  const sameQuestion = previous?.number === state.number;
  const justStopped = live && ((sameQuestion && previous?.spinning) || fresh.some(event => event.kind === "spin"));
  if (state.phase !== "playing" || state.attemptsLeft !== 8 || winner === null || (!sameQuestion && !justStopped)) {
    hideWheel();
    return;
  }
  if (!justStopped) return;
  const matrix = getComputedStyle(disc).transform;
  const rotation = matrix === "none" ? 0 : new DOMMatrixReadOnly(matrix);
  const from = rotation ? Math.atan2(rotation.b, rotation.a) * 180 / Math.PI : 0;
  const stop = -90 * winner;
  const destination = from + ((stop - from) % 360 + 360) % 360;
  disc.classList.remove("spinning");
  disc.style.transform = "rotate(" + stop + "deg)";
  if (!reducedMotion()) animate(disc, [{ transform: "rotate(" + from + "deg)" }, { transform: "rotate(" + destination + "deg)" }], 650);
  result.textContent = "First player: " + (winner + 1) + " · " + state.players[winner].name;
  result.hidden = false;
  wheel.hidden = false;
  burst(178);
  clearTimeout(wheelFade);
  wheelFade = setTimeout(hideWheel, 1700);
}
function render(state, live, fresh) {
  const questionChanged = previous?.number !== state.number || previous?.prompt !== state.prompt;
  const introducing = fresh.some(event => event.kind === "start" || event.kind === "question");
  const revealing = live && previous?.number === state.number && previous.phase !== "revealed" && state.phase === "revealed";
  const awarded = new Set(fresh.filter(event => event.kind === "hit").map(event => event.answer));
  const suffix = state.prompt ? " · Question " + state.number + "/12" : "";
  const winner = state.wheelWinner !== null ? " · First player: " + state.players[state.wheelWinner].name : "";
  const turn = state.spinning ? "Wheel spinning…"
    : state.active !== null ? "Turn: " + state.players[state.active].name + winner
    : state.phase === "ready" ? "Waiting for the wheel"
    : state.phase === "revealed" ? "Question complete" + winner : "";
  status.textContent = state.prompt ? turn + " · " + state.attemptsLeft + (state.attemptsLeft === 1 ? " attempt left" : " attempts left") : "";
  byId("counter").textContent = "UPMANDEX Anniversary" + suffix;
  byId("demo").hidden = !state.demo;
  byId("prompt").textContent = state.prompt || (state.phase === "final" ? "Final standings" : "The game is about to begin");
  renderWheel(state, live, fresh);
  state.players.forEach((player, i) => {
    const box = byId("player" + i);
    box.classList.toggle("active", i === state.active);
    box.firstElementChild.textContent = player.number + " · " + player.name;
    if (!busyScore(i)) writeScore(i, player.score);
    const label = byId("wheel-name" + i);
    label.textContent = player.name;
    label.parentElement.classList.toggle("long", player.name.length > 13);
  });
  const tiles = byId("tiles");
  if (questionChanged) tiles.replaceChildren();
  state.answers.forEach((answer, i) => {
    if (!questionChanged && JSON.stringify(previous.answers[i]) === JSON.stringify(answer)) return;
    const tile = node("div", "");
    tile.className = "tile";
    if (answer) {
      tile.classList.add("open");
      if (revealing && !awarded.has(i)) tile.classList.add("reveal-wave");
      else if (live && !questionChanged) tile.classList.add("revealing");
    }
    if (introducing) tile.classList.add("is-entering");
    tile.append(node("span", String(i + 1)), node("span", answer ? answer.text : "—"), node("strong", answer ? String(answer.points) : ""));
    if (tiles.children[i]) tiles.children[i].replaceWith(tile);
    else tiles.append(tile);
  });
  const rank = byId("rank");
  const winners = byId("winners");
  winners.hidden = state.phase !== "final";
  if (state.phase === "final") {
    const ranked = [...state.players].sort((a, b) => b.score - a.score || a.number - b.number);
    const shared = ranked.filter(player => player.score === ranked[0].score);
    winners.textContent = (shared.length === 1 ? "Winner: " : "Joint winners: ") + shared.map(player => player.name).join(" & ");
    const entries = ranked.map(player => {
      const place = ranked.findIndex(other => other.score === player.score) + 1;
      const row = node("li", "#" + place + " · " + player.name + " · " + player.score + " pts");
      row.classList.toggle("first", place === 1);
      return row;
    });
    if (previous?.phase !== "final" || JSON.stringify(previous.players) !== JSON.stringify(state.players)) {
      rank.classList.toggle("celebrate", live && previous?.phase !== "final");
      rank.replaceChildren(...entries);
    }
  } else rank.replaceChildren();
  previous = state;
}
async function refresh() {
  try {
    const response = await fetch("/api/gartic-feud/display", {
      headers: { Authorization: "Bearer " + token }, cache: "no-store", credentials: "omit",
      signal: AbortSignal.timeout(4500)
    });
    if (response.status === 401 || response.status === 403) {
      clearEffects();
      hideWheel();
      byId("stage").hidden = byId("demo").hidden = true;
      status.textContent = "This OBS link is invalid or expired. Ask the host for a new link.";
      return;
    }
    if (!response.ok) throw new Error();
    const state = await response.json();
    const live = cursor !== null;
    const fresh = collectEffects(state);
    render(state, live, fresh);
    playPending();
    byId("stage").hidden = false;
  } catch {
    clearEffects();
    hideWheel();
    cursor = null;
    status.textContent = "Connection lost. Reconnecting…";
  }
  setTimeout(refresh, 750);
}
if (token) void refresh();
else status.textContent = "Open the OBS link from the host panel.";
`;

export function GET() {
  const nonce = randomBytes(18).toString("base64");
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Gartic Feud · OBS</title>
<style nonce="${nonce}">${styles}</style></head><body>${ambienceMarkup}<main>
<header><p id="counter">UPMANDEX Anniversary</p><h1>Gartic Feud</h1></header>
<p id="demo" hidden>Demo · Sample questions</p>
<div id="stage" hidden>
<div class="side"><div class="player" id="player0"><strong></strong><span class="score"></span><span class="award" aria-hidden="true"></span></div><div class="player" id="player1"><strong></strong><span class="score"></span><span class="award" aria-hidden="true"></span></div></div>
<section id="board"><h2 id="prompt"></h2>${stageMarkup}<div id="wrong" aria-hidden="true">✕</div>
<div id="wheel" role="group" aria-label="Streamer wheel" hidden><div id="wheel-frame"><div id="disc">
${[1, 2, 3, 4].map((number, i) => `<span class="wheel-label"><strong>${number}</strong><span id="wheel-name${i}"></span></span>`).join("")}
</div></div><p id="roulette-result" hidden></p></div><div id="tiles"></div><ol id="rank"></ol></section>
<div class="side"><div class="player" id="player2"><strong></strong><span class="score"></span><span class="award" aria-hidden="true"></span></div><div class="player" id="player3"><strong></strong><span class="score"></span><span class="award" aria-hidden="true"></span></div></div>
</div><p id="status" aria-live="polite">Connecting…</p><button type="button" id="enable-audio" hidden>Enable audio</button>
</main><script nonce="${nonce}">${script}</script></body></html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'`,
    },
  });
}
