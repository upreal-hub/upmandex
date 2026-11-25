import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import test, { type TestContext } from "node:test";

const viewer = { twitchUserId: "12345", twitchLogin: "fixture_viewer", displayName: "Fixture" };
const rewardId = "11111111-1111-1111-1111-111111111111";
const redemptionId = "22222222-2222-2222-2222-222222222222";
const fixtureEnv = {
  DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:1/fixture?connect_timeout=1",
  STREAM_CHAT_SECRET: "fixture-chat",
  STREAMERBOT_SECRET: "fixture-streamerbot",
  EVENTUPMAN_SECRET: "fixture-event",
  AUTH_TWITCH_ID: "fixture-client",
  AUTH_TWITCH_SECRET: "fixture-client-secret",
  TWITCH_BROADCASTER_ID: "123",
};

function request(path: string, secret: string, body: unknown) {
  return new Request(`https://anniversary.example.test/api/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// Prisma synthesizes delegate methods through a Proxy, so mock.method cannot find their descriptors.
function mockPrisma<Args extends unknown[], Result>(context: TestContext, target: object, key: string, implementation: (...args: Args) => Result) {
  const original = Reflect.get(target, key);
  const mock = context.mock.fn(implementation);
  assert.ok(Reflect.set(target, key, mock));
  context.after(() => { Reflect.set(target, key, original); });
  return mock;
}

test("stream routes and achievements with isolated Twitch and Prisma mocks", async (context) => {
  for (const [key, value] of Object.entries(fixtureEnv)) {
    const previous = process.env[key];
    process.env[key] = value;
    context.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  type Resolve = (specifier: string, context: object) => object;
  const { registerHooks } = nodeModule as typeof nodeModule & {
    registerHooks(options: { resolve: (specifier: string, context: object, next: Resolve) => object }): { deregister(): void };
  };
  const hook = registerHooks({
    resolve(specifier, context, next) {
      return next(specifier === "server-only" ? "next/dist/compiled/server-only/empty.js" : specifier, context);
    },
  });
  context.after(() => hook.deregister());
  const { prisma } = await import("./prisma");
  const { getAchievementCatalog, getAchievementCosmetic, syncPersonAchievements } = await import("./achievements");
  const { Prisma } = await import("@/app/generated/prisma/client");
  const { POST: profile } = await import("../app/api/stream-profile/route");
  const { POST: card } = await import("../app/api/stream-card/route");
  const { POST: pull } = await import("../app/api/pulls/route");
  const { POST: eventRedeem } = await import("../app/api/event-redeems/route");
  const { POST: achievement } = await import("../app/api/twitch-achievement-events/route");

  await context.test("separates integration permissions and rejects malformed JSON", async () => {
    for (const [handler, path, secret] of [
      [profile, "stream-profile", "fixture-chat"], [card, "stream-card", "fixture-chat"],
      [pull, "pulls", "fixture-streamerbot"], [eventRedeem, "event-redeems", "fixture-event"],
      [achievement, "twitch-achievement-events", "fixture-chat"],
    ] as const) {
      assert.equal((await handler(request(path, "wrong-secret", viewer))).status, 401);
      assert.equal((await handler(request(path, secret, "{"))).status, 400);
    }
    assert.equal((await eventRedeem(request("event-redeems", "fixture-streamerbot", { rewardId, redemptionId, viewer }))).status, 401);
  });

  await context.test("private or missing profiles fall back without leaking cosmetics or hidden artwork", async (test) => {
    mockPrisma(test, prisma.upman, "findUnique", async ({ where }: { where: object }) => {
      assert.deepEqual(where, { slug: "normalupman", dexVisibility: "PUBLIC" });
      return null;
    });
    mockPrisma(test, prisma.user, "findUnique", async () => ({ ...viewer, avatar: null, person: {
      id: "private", isPublic: false, equippedCustomBackground: { image: "/private.png" },
      representedUpmans: [{ image: "/hidden.png" }],
    } }));
    const result = await profile(request("stream-profile", "fixture-chat", viewer));
    const projection = (await result.json()).profile;
    assert.equal(result.status, 200);
    assert.deepEqual(projection.background, { kind: "default" });
    assert.deepEqual(projection.representedUpman, { slug: "normalupman", name: "NormalUpman", image: null });
    const fallback = (await (await card(request("stream-card", "fixture-chat", viewer))).json()).card;
    assert.equal(fallback.kind, "twitch");
    assert.equal(fallback.personId, undefined);
    assert.equal(fallback.representedUpman, undefined);
  });

  await context.test("public card and chat/TTS projections share custom cosmetics and represented Upman", async (test) => {
    const represented = { slug: "public", name: "Public Upman", image: "/api/submission-media/fixture" };
    const background = { kind: "custom", image: "https://example.test/background.png" };
    mockPrisma(test, prisma.upman, "findUnique", async () => null);
    mockPrisma(test, prisma.user, "findUnique", async ({ select }: { select: { person: { select: { representedUpmans?: { where: object } } } } }) => {
      if (select.person.select.representedUpmans) assert.deepEqual(select.person.select.representedUpmans.where, { dexVisibility: "PUBLIC", rarity: { not: "Secret" } });
      return { ...viewer, avatar: null, person: {
        id: "person", userId: "user", isPublic: true, representedUpmans: [represented],
        equippedCustomBackground: { type: "BACKGROUND", image: background.image },
        equippedTitleAchievementKey: "collector-10", equippedAccentAchievementKey: "collector-50",
      } };
    });
    mockPrisma(test, prisma.personAchievement, "findMany", async () => [{ achievementKey: "collector-10" }]);
    mockPrisma(test, prisma.upman, "count", async () => 42);
    mockPrisma(test, prisma.inventory, "count", async () => 21);
    const projection = (await (await profile(request("stream-profile", "fixture-chat", viewer))).json()).profile;
    const fullCard = (await (await card(request("stream-card", "fixture-chat", viewer))).json()).card;
    assert.deepEqual(projection.background, background);
    assert.deepEqual(projection.representedUpman, { ...represented, image: represented.image + "?stream=1" });
    assert.equal(projection.accent.styleKey, "default");
    assert.deepEqual(fullCard.representedUpman, projection.representedUpman);
    assert.deepEqual(fullCard.background, projection.background);
    assert.equal(fullCard.title, "Cloud Collector");
    assert.deepEqual(fullCard.collection, { owned: 21, total: 42, percent: 50 });
  });

  await context.test("a pull creates one ownership and retries reuse the persisted result", async (test) => {
    let ownership = 0;
    const events = new Map<string, unknown>();
    const savedViewer = { ...viewer, id: "user", role: "USER" };
    const upman = { id: "upman", slug: "normalupman", name: "NormalUpman", rarity: "Legendary", image: "/upmans/normalupman.png", creator: "Creator", dexVisibility: "PUBLIC" };
    const transaction = {
      user: { findUnique: async () => savedViewer, update: async () => savedViewer },
      pullEvent: {
        findUnique: async ({ where }: { where: { requestId: string } }) => events.get(where.requestId) ?? null,
        create: async ({ data }: { data: { requestId: string } }) => events.set(data.requestId, data),
      },
      pullRarityRule: { findMany: async () => [{ rarity: "Legendary", weight: 100 }] },
      upman: { findMany: async () => [upman], update: async () => {}, updateMany: async () => {} },
      inventory: { findUnique: async () => ownership ? { id: "owned" } : null, create: async () => { ownership++; } },
      activityLog: { create: async () => {} },
    };
    mockPrisma(test, prisma, "$transaction", async (fn: (tx: typeof transaction) => unknown) => fn(transaction));
    mockPrisma(test, prisma.user, "findUnique", async () => savedViewer);
    mockPrisma(test, prisma.person, "findUnique", async () => null);
    const call = async (requestId: string) => {
      const response = await pull(request("pulls", "fixture-streamerbot", { requestId, viewer }));
      assert.equal(response.status, 200);
      return response.json();
    };
    const fresh = await call(redemptionId);
    assert.equal(fresh.result, "new");
    assert.equal(fresh.upman.publiclyDisplayable, true);
    assert.equal((await call(redemptionId)).idempotent, true);
    assert.equal((await call(rewardId)).result, "duplicate");
    assert.equal(ownership, 1);
    assert.equal(events.size, 2);
  });

  await context.test("Event Upman returns the saved grant or rejects an unconfigured reward", async (test) => {
    let replay = false;
    mockPrisma(test, prisma.upmanAcquisitionRule, "findFirst", async () => null);
    mockPrisma(test, prisma.upmanAcquisitionGrant, "findUnique", async () => replay ? { ruleId: "rule", rule: { method: "EVENT_REDEEM" } } : null);
    mockPrisma(test, prisma.user, "findUnique", async () => null);
    const transaction = { upmanAcquisitionGrant: { findUnique: async () => ({
      ...viewer, result: "NEW", upman: { slug: "event", name: "Event", rarity: "Event", image: "/event.png", creator: "Fixture", dexVisibility: "PUBLIC" },
    }) } };
    mockPrisma(test, prisma, "$transaction", async (fn: (tx: typeof transaction) => unknown) => fn(transaction));
    const call = () => eventRedeem(request("event-redeems", "fixture-event", { rewardId, redemptionId, viewer }));
    assert.equal((await call()).status, 404);
    replay = true;
    const result = await call();
    assert.equal(result.status, 200);
    assert.equal((await result.json()).idempotent, true);
  });

  await context.test("validated Twitch events record once and First! uses the authoritative stream", async (test) => {
    const events = new Map<string, { redemptionId: string; sessionId: string | null }>();
    let live = false;
    test.mock.method(globalThis, "fetch", async (url: string) => {
      if (url.startsWith("https://id.twitch.tv/")) return Response.json({ access_token: "fixture-access", expires_in: 3600 });
      assert.match(url, /^https:\/\/api\.twitch\.tv\/helix\/streams\?user_id=123$/);
      return Response.json({ data: live ? [{ id: "314" }] : [] });
    });
    const findUnique = async ({ where }: { where: { redemptionId: string } }) => events.get(where.redemptionId) ?? null;
    mockPrisma(test, prisma.twitchAchievementEvent, "findUnique", findUnique);
    mockPrisma(test, prisma.person, "findUnique", async () => null);
    const transaction = {
      user: { findFirst: async () => ({ ...viewer, id: "user", person: { id: "person" } }) },
      twitchAchievementEvent: { findUnique, create: async ({ data }: { data: { redemptionId: string; sessionId: string | null } }) => events.set(data.redemptionId, data), count: async () => 1 },
    };
    mockPrisma(test, prisma, "$transaction", async (fn: (tx: typeof transaction) => unknown) => fn(transaction));
    const call = (kind: string, id: string) => achievement(request("twitch-achievement-events", "fixture-chat", { ...viewer, kind, redemptionId: id, sessionId: "untrusted" }));
    assert.equal((await (await call("CHECK_IN", "check-in")).json()).checkInCount, 1);
    assert.equal((await (await call("CHECK_IN", "check-in")).json()).result, "duplicate");
    assert.equal((await call("FIRST", "first")).status, 409);
    assert.equal(events.size, 1);
    live = true;
    assert.equal((await (await call("FIRST", "first")).json()).result, "recorded");
    assert.equal(events.get("first")?.sessionId, "314");
    test.mock.method(transaction.twitchAchievementEvent, "create", async () => {
      throw new Prisma.PrismaClientKnownRequestError("fixture unique constraint", { code: "P2002", clientVersion: "fixture" });
    });
    assert.equal((await (await call("FIRST", "second-first")).json()).result, "already-claimed");
    assert.equal(events.size, 2);
  });

  await context.test("all active achievement thresholds persist once and legacy cosmetics remain available", async (test) => {
    const entries: { achievementKey: string; unlockedAt: Date }[] = [];
    const rarities = ["Common", "Rare", "Epic", "Mythic", "Legendary"];
    const upmans = rarities.map((rarity, index) => ({ id: String(index), rarity }));
    let complete = false;
    mockPrisma(test, prisma.person, "findUnique", async () => ({ id: "person", userId: "user", achievements: entries }));
    mockPrisma(test, prisma.upman, "findMany", async () => upmans);
    mockPrisma(test, prisma.upman, "count", async () => complete ? 50 : 0);
    mockPrisma(test, prisma.personArtwork, "count", async () => complete ? 100 : 0);
    mockPrisma(test, prisma.upmanSubmission, "count", async () => complete ? 25 : 0);
    mockPrisma(test, prisma.inventory, "findMany", async () => complete ? upmans.map(upman => ({ upman })) : []);
    mockPrisma(test, prisma.pullEvent, "findMany", async () => complete ? Array.from({ length: 500 }, () => ({ upmanRarity: "Legendary", result: "DUPLICATE" })) : []);
    mockPrisma(test, prisma.twitchAchievementEvent, "count", async () => complete ? 100 : 0);
    mockPrisma(test, prisma.upmanAcquisitionGrant, "findMany", async () => complete ? Array.from({ length: 50 }, (_, index) => ({ upmanId: String(index), rule: { eventId: String(index) } })) : []);
    const writes = mockPrisma(test, prisma.personAchievement, "createMany", async ({ data, skipDuplicates }: { data: { achievementKey: string }[]; skipDuplicates: boolean }) => {
      assert.equal(skipDuplicates, true);
      entries.push(...data.map(({ achievementKey }: { achievementKey: string }) => ({ achievementKey, unlockedAt: new Date(0) })));
      return { count: data.length };
    });
    assert.equal((await syncPersonAchievements("person"))?.summary.unlocked, 0);
    complete = true;
    const progress = await syncPersonAchievements("person");
    assert.equal(progress?.summary.unlocked, getAchievementCatalog().length);
    assert.equal((await syncPersonAchievements("person"))?.summary.unlocked, progress?.summary.unlocked);
    assert.equal(writes.mock.callCount(), 1);
    assert.ok(getAchievementCosmetic("upman-artist-1", "title"));
    assert.ok(!entries.some(entry => entry.achievementKey === "upman-artist-1"));
  });
});
