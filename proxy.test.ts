import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

import { config, proxy } from "./proxy";

function request(pathname: string, method = "GET") {
  return new NextRequest(`https://upmandex.com${pathname}`, { method });
}

test("leaves the existing site untouched while maintenance is disabled", () => {
  process.env.MAINTENANCE_MODE = "false";
  assert.equal(proxy(request("/api/pulls", "POST")).status, 200);
});

test("returns 503 for every API method while maintenance is enabled", async () => {
  process.env.MAINTENANCE_MODE = "true";

  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    const response = proxy(request("/api/reward-upman", method));
    assert.equal(response.status, 503, method);
    assert.equal(response.headers.get("retry-after"), "3600", method);
    assert.equal((await response.json()).error, "UPMANDEX is temporarily unavailable for maintenance.", method);
  }
});

test("blocks the OAuth callback and rewrites public pages with status 503", () => {
  process.env.MAINTENANCE_MODE = "true";

  assert.equal(proxy(request("/api/auth/callback/twitch")).status, 503);

  const response = proxy(request("/community"));
  assert.equal(response.status, 503);
  assert.match(response.headers.get("x-middleware-rewrite") ?? "", /\/maintenance$/);
});

test("runs for application and API routes but not static maintenance resources", () => {
  assert.equal(unstable_doesMiddlewareMatch({ config, url: "/community" }), true);
  assert.equal(unstable_doesMiddlewareMatch({ config, url: "/api/pulls" }), true);
  assert.equal(unstable_doesMiddlewareMatch({ config, url: "/_next/static/chunks/main.js" }), false);
  assert.equal(unstable_doesMiddlewareMatch({ config, url: "/favicon.ico" }), false);
});
