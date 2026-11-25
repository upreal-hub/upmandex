import assert from "node:assert/strict";
import test from "node:test";
import { isPrivateSiteAuthPath, isPrivateSiteIntegrationPath, isPrivateSiteMember } from "./private-site-access";
import { validateUpmanRelationshipPayload } from "./validation";

test("private membership uses exact Twitch IDs and denies an empty list", () => {
  assert.equal(isPrivateSiteMember("123", "12, 123"), true);
  assert.equal(isPrivateSiteMember("12", "123"), false);
  assert.equal(isPrivateSiteMember("upreal_", "upreal_"), false);
  assert.equal(isPrivateSiteMember("123", ""), false);
  assert.equal(isPrivateSiteMember(undefined, "123"), false);
});

test("private exceptions match an exact route and method", () => {
  assert.equal(isPrivateSiteAuthPath("GET", "/api/auth/callback/twitch"), true);
  assert.equal(isPrivateSiteAuthPath("GET", "/api/auth/callback/other"), false);
  assert.equal(isPrivateSiteIntegrationPath("POST", "/api/stream-profile"), true);
  assert.equal(isPrivateSiteIntegrationPath("GET", "/api/stream-profile"), false);
  assert.equal(isPrivateSiteIntegrationPath("POST", "/api/stream-profile/extra"), false);
  assert.equal(isPrivateSiteIntegrationPath("GET", "/api/viewer-inventory"), false);
  assert.equal(isPrivateSiteIntegrationPath("POST", "/api/admin-upmans"), false);
});

test("unlink accepts a current Person guard and preserves the existing payload", () => {
  const payload = { relation: "represented", source: "unlink" };
  assert.deepEqual(validateUpmanRelationshipPayload(payload), { success: true, data: payload });
  const guarded = { ...payload, expectedPersonId: "person123" };
  assert.deepEqual(validateUpmanRelationshipPayload(guarded), { success: true, data: guarded });
  assert.equal(validateUpmanRelationshipPayload({ ...payload, expectedPersonId: null }).success, false);
});
