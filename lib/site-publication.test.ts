import assert from "node:assert/strict";
import test from "node:test";
import * as nodeModule from "node:module";

test("real publication handlers: owner-only, fail-closed, atomic audit, races, restart and recovery", async context => {
  const env = {
    DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:1/fixture",
    UPMANDEX_ENV: "anniversary", UPMANDEX_PRIVATE_ACCESS: "1",
    UPMANDEX_RELEASE_ADMIN_TWITCH_ID: "111", UPMANDEX_PRIVATE_TWITCH_IDS: "111,222",
    UPMANDEX_RELEASE_READY: "1",
    UPMANDEX_AUTH_DIAGNOSTIC: "0", UPMANDEX_MEW_RUNTIME_ENABLED: "0",
    AUTH_SECRET: "fixture", AUTH_TWITCH_ID: "fixture", AUTH_TWITCH_SECRET: "fixture",
    PRIVATE_BLOB_READ_WRITE_TOKEN: "fixture-no-storage-access",
  };
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  const fixture = { id: "111" as string | null, admin: true };
  type Resolve = (specifier: string, context: object) => object;
  const { registerHooks } = nodeModule as typeof nodeModule & {
    registerHooks(options: { resolve: (specifier: string, context: object, next: Resolve) => object }): { deregister(): void };
  };
  const hook = registerHooks({ resolve(specifier, context, next) {
    if (specifier === "server-only") return next("next/dist/compiled/server-only/empty.js", context);
    return next(specifier, context);
  } });
  try {
    const { prisma } = await import("./prisma");
    const saved = { status: "PRIVATE", version: 0, history: [] as unknown[] };
    let available = true;
    let writeFailure: "before" | "after" | null = null;
    const originalQuery = prisma.$queryRaw;
    context.after(() => { prisma.$queryRaw = originalQuery; });
    prisma.$queryRaw = (async (sql: TemplateStringsArray, ...values: unknown[]) => {
      if (!available) throw Error("fixture storage unavailable");
      const statement = sql.join("?");
      if (statement.includes("SELECT")) return [{ status: saved.status, version: saved.version }];
      assert.match(statement, /UPDATE "SitePublication"/);
      assert.match(statement, /"history" = "history" \|\| jsonb_build_array/);
      assert.match(statement, /"version" = \? AND "status" <> \?/);
      const [status, , actor, version] = values;
      if (saved.version !== version || saved.status === status) return [];
      if (writeFailure === "before") throw Error("fixture write unavailable");
      saved.history.push({ from: saved.status, to: status, actor });
      saved.status = status as string;
      saved.version++;
      if (writeFailure === "after") throw Error("fixture response was lost after commit");
      return [{ status: saved.status, version: saved.version }];
    }) as typeof prisma.$queryRaw;
    const service = await import("./site-publication");
    const { createPublicationHandlers } = await import("./site-publication-handler");
    const route = createPublicationHandlers(async () => fixture.admin ? fixture.id : null);
    const request = (status: string, version: number, origin = "https://upmandex.example.test") => new Request("https://upmandex.example.test/api/admin/release", {
      method: "POST", headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify({ status, version, confirmation: status === "PUBLIC" ? "Release UPMANDEX" : "Return to PRIVATE" }),
    });
    assert.equal(await service.isSitePrivate(), true);
    assert.equal(saved.history.length, 0); // Neither reads nor imports can release.
    fixture.admin = false;
    assert.equal((await route.POST(request("PUBLIC", 0))).status, 403);
    fixture.admin = true;
    fixture.id = "222";
    assert.equal((await route.POST(request("PUBLIC", 0))).status, 403);
    fixture.id = "111";
    assert.equal((await route.POST(request("PUBLIC", 0, "https://evil.example.test"))).status, 403);
    process.env.UPMANDEX_RELEASE_READY = "0";
    assert.equal((await route.POST(request("PUBLIC", 0))).status, 503);
    process.env.UPMANDEX_RELEASE_READY = "1";
    for (const mode of ["UPMANDEX_AUTH_DIAGNOSTIC", "UPMANDEX_MEW_RUNTIME_ENABLED"]) {
      process.env[mode] = "1";
      const state = await (await route.GET()).json();
      assert.match(state.blockers.join(" "), /Temporary authentication or transfer mode/);
      assert.equal((await route.POST(request("PUBLIC", 0))).status, 503);
      assert.equal(saved.history.length, 0);
      process.env[mode] = "0";
    }
    const simultaneous = await Promise.all([route.POST(request("PUBLIC", 0)), route.POST(request("PUBLIC", 0))]);
    assert.deepEqual(simultaneous.map(value => value.status).sort(), [200, 409]);
    assert.equal(saved.history.length, 1);
    assert.equal(await service.isSitePrivate(), false);
    // A fresh read uses durable storage, not a process-level publication variable.
    assert.equal((await service.readPublication()).version, 1);
    process.env.UPMANDEX_RELEASE_READY = "0"; // Emergency closure never requires launch readiness.
    assert.equal((await route.POST(request("PRIVATE", 1))).status, 200);
    assert.equal(await service.isSitePrivate(), true);
    assert.equal(saved.history.length, 2);
    assert.equal((await route.POST(request("PUBLIC", 0))).status, 503);
    available = false;
    assert.equal(await service.isSitePrivate(), true);
    assert.equal((await service.readPublication()).available, false);
    assert.equal((await route.POST(request("PRIVATE", 2))).status, 503);
    available = true;
    process.env.UPMANDEX_RELEASE_READY = "1";
    writeFailure = "before";
    assert.equal((await route.POST(request("PUBLIC", 2))).status, 503);
    assert.equal((await (await route.GET()).json()).status, "PRIVATE");
    assert.equal(saved.history.length, 2);
    writeFailure = "after";
    assert.equal((await route.POST(request("PUBLIC", 2))).status, 503);
    assert.equal((await (await route.GET()).json()).status, "PUBLIC");
    assert.equal((await route.POST(request("PUBLIC", 2))).status, 409);
    assert.equal(saved.history.length, 3);
    writeFailure = null;
    assert.equal((await route.POST(request("PRIVATE", 3))).status, 200);
    assert.equal(await service.isSitePrivate(), true);
    saved.status = "PUBLIC";
    const previousVercel = process.env.VERCEL;
    process.env.VERCEL = "1";
    try {
      delete process.env.UPMANDEX_PRIVATE_ACCESS;
      assert.equal(await service.isSitePrivate(), true);
      process.env.UPMANDEX_PRIVATE_ACCESS = "1";
      delete process.env.UPMANDEX_ENV;
      assert.equal(await service.isSitePrivate(), true);
    } finally {
      if (previousVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = previousVercel;
    }
  } finally {
    hook.deregister();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
