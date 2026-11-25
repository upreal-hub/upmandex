import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import test from "node:test";
import { NextRequest } from "next/server";
import { encode } from "@auth/core/jwt";
import { activePlayer, demoSetup, displayView, move, newGame } from "./gartic-feud";
import { canReadDisplay, issueDisplayToken } from "./gartic-feud-token";

test("a round circulates twice, awards each hit once, and reveals the remainder on attempt eight", () => {
  let game = move(move(newGame(), { type: "start" }), { type: "spin" }, 0, () => 2);
  assert.equal(activePlayer(game, 2999), null);
  assert.equal(displayView(game, 2999).wheelWinner, null);
  assert.deepEqual(displayView(game, 2999).answers, Array(8).fill(null));
  assert.throws(() => move(game, { type: "miss" }, 2999));
  const turns = [];
  for (let attempt = 0; attempt < 8; attempt++) {
    turns.push(activePlayer(game, 3000));
    game = move(game, attempt === 0 ? { type: "hit", answer: 0 } : { type: "miss" }, 3000);
    if (!attempt) {
      assert.throws(() => move(game, { type: "hit", answer: 0 }, 3000));
      assert.deepEqual(displayView(game, 3000).answers.slice(1), Array(7).fill(null));
    }
  }
  assert.deepEqual(turns, [2, 3, 0, 1, 2, 3, 0, 1]);
  assert.deepEqual(game.scores, [0, 0, 40, 0]);
  assert.equal(game.phase, "revealed");
  assert.equal(displayView(game).attemptsLeft, 0);
  assert.ok(displayView(game).answers.every(Boolean));
  assert.throws(() => move(game, { type: "miss" }));
});

test("setup validates all questions and scores accumulate through question twelve", () => {
  const setup = demoSetup();
  assert.throws(() => move(newGame(), { type: "setup", setup: { ...setup, questions: [] } }));
  assert.throws(() => move(newGame(), { type: "setup", setup: {
    ...setup, questions: setup.questions.map(q => ({ ...q, answers: q.answers.slice(1) })),
  } }));
  assert.throws(() => move(newGame(), { type: "setup", setup: {
    ...setup, questions: setup.questions.map(q => ({ ...q, answers: q.answers.map(a => ({ ...a, points: -1 })) })),
  } }));
  setup.players[0] = "Joueur réglé";
  let game = move(move(newGame(), { type: "setup", setup }), { type: "start" });
  for (let question = 0; question < 12; question++) {
    assert.equal(game.question, question);
    assert.throws(() => move(game, { type: "next" }));
    game = move(game, { type: "spin" }, 0, () => 0);
    game = move(game, { type: "hit", answer: 1 }, 3000);
    game = move(game, { type: "reveal" }, 3000);
    assert.ok(displayView(game).answers.every(Boolean));
    game = move(game, { type: "next" });
  }
  assert.equal(game.phase, "final");
  assert.equal(game.scores[0], 12 * 35);
  game = move(game, { type: "score", player: 0, score: 400 });
  assert.equal(game.scores[0], 400);
  assert.throws(() => move(game, { type: "reset" }));
  const reset = move(game, { type: "reset", confirmation: "Réinitialiser" });
  assert.deepEqual(reset.questions, setup.questions);
  assert.deepEqual(reset.players, setup.players);
  assert.deepEqual(reset.scores, [0, 0, 0, 0]);
});

test("OBS tokens are scoped to the secret and expire", () => {
  const start = 1_800_000_000_000;
  const token = issueDisplayToken("fixture", start);
  assert.equal(canReadDisplay("Bearer " + token, "fixture", start), true);
  assert.equal(canReadDisplay("Bearer " + token, "other", start), false);
  assert.equal(canReadDisplay("Bearer " + token, "fixture", start + 43_200_000), false);
  assert.equal(canReadDisplay("Bearer " + token + "x", "fixture", start), false);
});

test("actual handlers enforce owner role, per-revision writes and token-only OBS projection under PRIVATE", async context => {
  const origin = "https://gartic.example.test";
  const secret = "fixture-auth-secret";
  const salt = "__Secure-authjs.session-token";
  const env = {
    AUTH_URL: origin, AUTH_SECRET: secret, UPMANDEX_ENV: "anniversary", UPMANDEX_PRIVATE_ACCESS: "1",
    UPMANDEX_PRIVATE_TWITCH_IDS: "111,222", UPMANDEX_RELEASE_ADMIN_TWITCH_ID: "111",
    DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:1/fixture",
  };
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  type Resolve = (specifier: string, context: object) => object;
  const { registerHooks } = nodeModule as typeof nodeModule & {
    registerHooks(options: { resolve: (specifier: string, context: object, next: Resolve) => object }): { deregister(): void };
  };
  const hook = registerHooks({ resolve(specifier, context, next) {
    return next(specifier === "server-only" ? "next/dist/compiled/server-only/empty.js" : specifier, context);
  } });
  const { checkGarticOwner } = await import("./gartic-feud-owner");
  const { prisma } = await import("./prisma");
  const { proxy } = await import("../proxy");
  const { createGarticHostHandlers } = await import("./gartic-feud-host");
  const display = await import("../app/api/gartic-feud/display/route");
  const shell = await import("../app/gartic-feud/display/route");
  const { Script } = await import("node:vm");
  let twitchId: string | null = "111";
  let role = "ADMIN";
  let saved: { revision: number; state: ReturnType<typeof newGame> } | null = null;
  let reads = 0;
  const host = createGarticHostHandlers(() => checkGarticOwner(twitchId, async () => ({ ok: role === "ADMIN" })));
  const originalQuery = prisma.$queryRaw;
  context.after(() => { prisma.$queryRaw = originalQuery; });
  prisma.$queryRaw = (async (sql: TemplateStringsArray, ...values: unknown[]) => {
    if (sql.join("").includes('"SitePublication"')) return [{ status: "PRIVATE", version: 0 }];
    if (sql[0].includes("SELECT")) { reads++; return saved ? [saved] : []; }
    assert.match(sql.join(""), /ON CONFLICT[^\n]*DO UPDATE/);
    const [next, data, expected] = values as [number, string, number];
    if (saved && saved.revision !== expected) return [];
    saved = { revision: next, state: JSON.parse(data) };
    return [saved];
  }) as typeof prisma.$queryRaw;
  try {
    const request = (body: object, source = origin) => new Request(origin + "/api/admin/gartic-feud", {
      method: "POST", headers: { origin: source, "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    assert.equal((await proxy(new NextRequest(origin + "/gartic-feud/display")))?.headers.get("x-middleware-next"), "1");
    const html = await shell.GET().text();
    assert.ok(!html.includes(demoSetup().questions[0].answers[0].text));
    assert.doesNotThrow(() => new Script(html.match(/<script[^>]*>([\s\S]+)<\/script>/)![1]));
    assert.equal((await proxy(new NextRequest(origin + "/api/gartic-feud/display")))?.status, 401);
    assert.equal((await display.GET(new Request(origin + "/api/gartic-feud/display"))).status, 401);
    assert.equal(reads, 0);
    assert.equal((await host.POST(request({ type: "start", revision: 0 }, "https://elsewhere.test"))).status, 403);
    twitchId = "222";
    assert.equal((await host.GET()).status, 403);
    assert.equal((await host.POST(request({ type: "obs" }))).status, 403);
    twitchId = "111";
    role = "USER";
    assert.equal((await host.POST(request({ type: "start", revision: 0 }))).status, 403);
    role = "ADMIN";
    const tokenResponse = await host.POST(request({ type: "obs" }));
    const { token } = await tokenResponse.json();
    const obs = new NextRequest(origin + "/api/gartic-feud/display", { headers: { authorization: "Bearer " + token } });
    assert.equal((await proxy(obs))?.headers.get("x-middleware-next"), "1");
    const cookie = salt + "=" + await encode({ secret, salt, token: { twitchUserId: "111" } });
    assert.equal((await proxy(new NextRequest(origin + "/admin/gartic-feud", { headers: { cookie } })))?.headers.get("x-middleware-next"), "1");
    const writes = await Promise.all([host.POST(request({ type: "start", revision: 0 })), host.POST(request({ type: "start", revision: 0 }))]);
    assert.deepEqual(writes.map(r => r.status).sort(), [200, 409]);
    const live = await (await display.GET(obs)).json();
    assert.deepEqual(live.answers, Array(8).fill(null));
    assert.equal(live.prompt, demoSetup().questions[0].text);
    assert.equal("questions" in live, false);
    assert.equal((await host.POST(request({ type: "reveal", revision: 1 }))).status, 200);
    assert.ok((await (await display.GET(obs)).json()).answers.every(Boolean));
  } finally {

    hook.deregister();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
