import assert from "node:assert/strict";
import test from "node:test";
import { checkPrismaEnvironment } from "./prisma-build-policy";

test("postinstall generation works without deployment labels or a database", () => {
  assert.doesNotThrow(() => checkPrismaEnvironment({ VERCEL: "1" }, "generate"));
  assert.doesNotThrow(() => checkPrismaEnvironment({ VERCEL: "1", VERCEL_ENV: "production" }, "generate"));
});
test("generation exception never permits database commands in Production", () => {
  for (const command of ["migrate", "db", "studio", undefined]) {
    assert.throws(() => checkPrismaEnvironment({ VERCEL: "1", VERCEL_ENV: "production", UPMANDEX_ENV: "anniversary" }, command));
    assert.throws(() => checkPrismaEnvironment({ VERCEL: "1", VERCEL_ENV: "preview" }, command));
  }
  assert.doesNotThrow(() => checkPrismaEnvironment({ VERCEL: "1", VERCEL_ENV: "preview", UPMANDEX_ENV: "anniversary" }, "migrate"));
});
