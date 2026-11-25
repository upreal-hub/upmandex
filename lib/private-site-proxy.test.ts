import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import test from "node:test";
import { encode } from "@auth/core/jwt";
import { NextRequest } from "next/server";

test("real Proxy and Auth.js handlers protect Preview requests without external services", async (context) => {
  const secret = "fixture-only-session-secret-never-deployed";
  const salt = "__Secure-authjs.session-token";
  const origin = "https://anniversary.example.test";
  const environment = {
    AUTH_SECRET: secret,
    AUTH_TWITCH_ID: "fixture",
    AUTH_TWITCH_SECRET: "fixture",
    AUTH_URL: origin,
    DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:1/fixture?connect_timeout=1",
    UPMANDEX_PRIVATE_ACCESS: "1",
    UPMANDEX_PRIVATE_TWITCH_IDS: "111,222",
    STREAM_CHAT_SECRET: "fixture-chat",
  };
  const previous = Object.fromEntries(Object.keys(environment).map(key => [key, process.env[key]]));
  Object.assign(process.env, environment);
  type Resolve = (specifier: string, context: object) => object;
  const { registerHooks } = nodeModule as typeof nodeModule & {
    registerHooks(options: { resolve: (specifier: string, context: object, next: Resolve) => object }):
      { deregister(): void };
  };
  const hook = registerHooks({
    resolve(specifier, context, next) {
      return next(specifier === "server-only" ? "next/dist/compiled/server-only/empty.js" : specifier, context);
    },
  });
  try {
    const { proxy } = await import("../proxy");
    const { handlers } = await import("../auth");
    const { prisma } = await import("./prisma");
    let publication = "PRIVATE";
    const originalQuery = prisma.$queryRaw;
    context.after(() => { prisma.$queryRaw = originalQuery; });
    prisma.$queryRaw = (async () => [{ status: publication, version: 0 }]) as typeof prisma.$queryRaw;
    const cookie = async (id: string, isAdmin = false) =>
      salt + "=" + await encode({ secret, salt, token: { twitchUserId: id, isAdmin } });
    const call = async (path: string, init?: ConstructorParameters<typeof NextRequest>[1],
      host = origin) => {
      const result = await proxy(new NextRequest(host + path, init));
      assert.ok(result);
      assert.match(result.headers.get("cache-control") ?? "", /private, no-store/);
      return result;
    };
    const anonymous = await call("/my-collection");
    assert.equal(anonymous.status, 307);
    assert.equal(new URL(anonymous.headers.get("location")!).pathname, "/waiting");
    assert.equal((await call("/")).headers.get("location"), origin + "/waiting");
    const deploymentOrigin = "https://upmandex-83sg64rrk-upreal-s-projects.vercel.app";
    const deploymentAnonymous = await call("/my-collection", undefined, deploymentOrigin);
    assert.equal(new URL(deploymentAnonymous.headers.get("location")!).origin, deploymentOrigin);
    assert.equal((await call("/waiting")).headers.get("x-middleware-next"), "1");
    assert.equal((await call("/_next/static/fixture.js")).headers.get("x-middleware-next"), "1");
    assert.equal((await call("/api/viewer-inventory")).status, 401);
    process.env.UPMANDEX_MEW_RUNTIME_ENABLED = "1";
    try {
      assert.equal((await call("/api/viewer-inventory")).status, 401);
      assert.equal((await call("/api/operations/mew-private-transfer", { method: "POST" })).headers.get("x-middleware-next"), "1");
      assert.equal((await call("/api/operations/mew-private-transfer/other", { method: "POST" })).status, 401);
      assert.equal((await call("/api/operations/mew-private-transfer")).headers.get("x-middleware-next"), "1");
      assert.equal((await call("/api/operations/mew-private-transfer", { method: "DELETE" })).status, 401);
    } finally { delete process.env.UPMANDEX_MEW_RUNTIME_ENABLED; }
    assert.equal((await call("/api/viewer-inventory", undefined, "https://alternate.example.test")).status, 401);
    const unlisted = { cookie: await cookie("333", true) };
    assert.equal((await call("/api/viewer-inventory", { headers: unlisted })).status, 401);
    const revokedSession = await handlers.GET(new NextRequest(origin + "/api/auth/session", { headers: unlisted }));
    assert.equal(await revokedSession.json(), null);
    assert.equal((await call("/my-collection", { headers: { cookie: await cookie("111") } })).headers.get("x-middleware-next"), "1");
    assert.equal((await call("/admin", { headers: { cookie: await cookie("222", true) } })).headers.get("x-middleware-next"), "1");
    const machine = { method: "POST", headers: { authorization: "Bearer fixture-chat" } };
    assert.equal((await call("/api/stream-profile", machine)).headers.get("x-middleware-next"), "1");
    assert.equal((await call("/api/admin-upmans", machine)).status, 401);
    assert.equal((await call("/api/stream-profile", { method: "POST" })).status, 401);
    assert.equal((await call("/api/stream-profile", { ...machine, headers: { authorization: "Bearer wrong" } })).status, 401);
    for (const [path, method] of [
      ["/api/auth/csrf", "GET"], ["/api/auth/signin", "GET"],
      ["/api/auth/callback/twitch", "GET"], ["/api/auth/signin/twitch", "POST"],
    ]) {
      const authRoute = await call(path, { method });
      assert.equal(authRoute.headers.get("x-middleware-next"), "1");
      assert.deepEqual(authRoute.headers.getSetCookie(), []);
    }
    const form = await handlers.GET(new NextRequest(origin + "/api/auth/signin"));
    assert.equal(form.status, 200);
    assert.match(await form.text(), /\/api\/auth\/signin\/twitch/);
    const csrf = await handlers.GET(new NextRequest(origin + "/api/auth/csrf"));
    const { csrfToken } = await csrf.json() as { csrfToken: string };
    const csrfCookie = csrf.headers.getSetCookie().find(value => value.startsWith("__Host-authjs.csrf-token="));
    assert.ok(csrfCookie);
    context.mock.method(globalThis, "fetch", async (input: URL | string) => {
      assert.equal(String(input), "https://id.twitch.tv/oauth2/.well-known/openid-configuration");
      return Response.json({
        issuer: "https://id.twitch.tv/oauth2",
        authorization_endpoint: "https://id.twitch.tv/oauth2/authorize",
        token_endpoint: "https://id.twitch.tv/oauth2/token",
      });
    });
    const oauth = await handlers.POST(new NextRequest(origin + "/api/auth/signin/twitch", {
      method: "POST",
      headers: { cookie: csrfCookie.split(";")[0] },
      body: new URLSearchParams({ csrfToken, callbackUrl: origin }),
    }));
    const authorization = new URL(oauth.headers.get("location")!);
    assert.equal(authorization.origin + authorization.pathname, "https://id.twitch.tv/oauth2/authorize");
    assert.equal(authorization.searchParams.get("redirect_uri"), origin + "/api/auth/callback/twitch");
    const session = await handlers.GET(new NextRequest(origin + "/api/auth/session", {
      headers: { cookie: await cookie("222", true) },
    }));
    assert.equal((await session.json()).user.twitchUserId, "222");
    publication = "PUBLIC";
    assert.equal((await call("/")).headers.get("x-middleware-next"), "1");
    assert.equal((await call("/upmans")).headers.get("x-middleware-next"), "1");
    for (const method of ["GET", "HEAD"]) {
      const waiting = await call("/waiting?stale=1", { method }, deploymentOrigin);
      assert.equal(waiting.status, 307);
      assert.equal(waiting.headers.get("location"), deploymentOrigin + "/");
    }
    publication = "PRIVATE";
    assert.equal((await call("/api/viewer-inventory")).status, 401);
    assert.equal((await call("/waiting")).headers.get("x-middleware-next"), "1");
  } finally {
    hook.deregister();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
