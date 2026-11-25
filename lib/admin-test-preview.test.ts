import assert from "node:assert/strict";
import test from "node:test";
import { verifyAdminTestPreview } from "./admin-test-preview";

const qa = {
  UPMANDEX_ADMIN_TEST_PREVIEW: "1", VERCEL_ENV: "preview", UPMANDEX_ENV: "anniversary",
  UPMANDEX_PRIVATE_ACCESS: "1", UPMANDEX_PRIVATE_TWITCH_IDS: "101,202",
  DATABASE_URL: "postgresql://fixture:fixture@ep-isolated.neon.tech/neondb",
  UPMANDEX_TEST_DATABASE_HOST: "ep-isolated.neon.tech",
  AUTH_SECRET: "fixture", AUTH_TWITCH_ID: "fixture", AUTH_TWITCH_SECRET: "fixture",
};

test("accepts an isolated private Preview and leaves normal environments alone", () => {
  assert.doesNotThrow(() => verifyAdminTestPreview(qa));
  assert.doesNotThrow(() => verifyAdminTestPreview({ VERCEL_ENV: "production" }));
});

test("refuses wrong database, public Preview, production and an incomplete access list", () => {
  assert.throws(() => verifyAdminTestPreview({ ...qa, DATABASE_URL: qa.DATABASE_URL.replace("ep-isolated", "ep-other") }), /endpoint/);
  assert.throws(() => verifyAdminTestPreview({ ...qa, UPMANDEX_PRIVATE_ACCESS: "0" }), /private/);
  assert.throws(() => verifyAdminTestPreview({ ...qa, VERCEL_ENV: "production" }), /private/);
  assert.throws(() => verifyAdminTestPreview({ ...qa, UPMANDEX_PRIVATE_TWITCH_IDS: "101,101" }), /distinct/);
});
