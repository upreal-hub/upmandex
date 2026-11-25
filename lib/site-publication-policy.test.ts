import assert from "node:assert/strict";
import test from "node:test";
import { canReadSubmissionMedia, isReleaseOwner, publicationRequest } from "./site-publication-policy";

test("release belongs to one exact stable Twitch identity", () => {
  assert.equal(isReleaseOwner("123", "123"), true);
  for (const id of [undefined, "other-admin", "12", "upreal_"]) assert.equal(isReleaseOwner(id, "123"), false);
  assert.equal(isReleaseOwner("", ""), false);
});
test("publication and recovery both require explicit versioned confirmation", () => {
  assert.deepEqual(publicationRequest({ status: "PUBLIC", version: 0, confirmation: "Release UPMANDEX" }), { status: "PUBLIC", version: 0 });
  assert.deepEqual(publicationRequest({ status: "PRIVATE", version: 1, confirmation: "Return to PRIVATE" }), { status: "PRIVATE", version: 1 });
  for (const value of [null, {}, { status: "PUBLIC", version: 0 },
    { status: "PUBLIC", version: -1, confirmation: "Release UPMANDEX" },
    { status: "PRIVATE", version: 1, confirmation: "Release UPMANDEX" }]) assert.equal(publicationRequest(value), null);
});
test("submission media stays restricted after Release and on alternative hosts", () => {
  const denied = { admin: false, owner: false, approvedPublic: false, privateSite: false, member: false };
  assert.equal(canReadSubmissionMedia(denied), false);
  assert.equal(canReadSubmissionMedia({ ...denied, owner: true }), true);
  assert.equal(canReadSubmissionMedia({ ...denied, approvedPublic: true }), true);
  assert.equal(canReadSubmissionMedia({ ...denied, privateSite: true, approvedPublic: true }), false);
  assert.equal(canReadSubmissionMedia({ ...denied, privateSite: true, admin: true, member: true }), true);
});
