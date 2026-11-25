import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/app/generated/prisma/client";
import { handleCreatorCredit } from "./upman-creator-admin";
import { resolvePublicCreatorIdentity } from "./upman-identity";

const empty = { creator: "", creatorTwitch: null, creatorPersonId: null };
const payload = { operation: "add", expected: empty, displayName: "Artist credit",
  twitchLogin: "", personId: null, userId: "user1" };
const request = (body: unknown) => new Request("https://example.test", { method: "PATCH", body: JSON.stringify(body) });

function fixture() {
  let row = { ...empty, id: "upman1", slug: "upman-one", name: "Upman One", representedPersonId: "viewer1" };
  let failUpdate = false;
  const logs: unknown[] = [];
  const writes: unknown[] = [];
  const tx = {
    upman: {
      findUnique: async () => ({ ...row }),
      update: async ({ where, data }: { where: object; data: typeof empty }) => {
        if (failUpdate) throw { code: "P2034" };
        writes.push({ where, data });
        row = { ...row, ...data };
      },
    },
    user: { findUnique: async () => ({ id: "user1", twitchLogin: "verified", person: { id: "artist1", isPublic: true } }) },
    person: { findUnique: async () => ({ id: "artist1", isPublic: true, user: null }) },
    activityLog: { create: async (input: unknown) => { logs.push(input); } },
  } as unknown as Prisma.TransactionClient;
  return {
    row: () => row, writes, logs, failUpdate: () => { failUpdate = true; },
    run: (body: unknown) => handleCreatorCredit(request(body), "upman-one", {
      authorize: async () => ({ ok: true, user: { id: "admin", twitchLogin: "admin" } }),
      transaction: action => action(tx),
    }),
  };
}

test("Add, Edit and confirmed Delete write only the credit fields and an activity entry", async () => {
  const f = fixture();
  assert.equal((await f.run(payload)).status, 200);
  const linked = { creator: "Artist credit", creatorTwitch: "verified", creatorPersonId: "artist1" };
  assert.deepEqual(f.writes[0], { where: { id: "upman1", ...empty }, data: linked });
  assert.equal((await f.run({ ...payload, operation: "edit", expected: linked, userId: null,
    displayName: "Corrected Credit", twitchLogin: "@Artist_Handle" })).status, 200);
  const edited = { creator: "Corrected Credit", creatorTwitch: "artist_handle", creatorPersonId: null };
  assert.equal((await f.run({ operation: "delete", expected: edited })).status, 200);
  assert.deepEqual(f.writes[2], { where: { id: "upman1", ...edited }, data: empty });
  assert.equal(f.row().representedPersonId, "viewer1");
  assert.equal(f.logs.length, 3);
  assert.equal(resolvePublicCreatorIdentity(f.row(), null).source, "unknown");
});

test("non-admin requests never start a transaction", async () => {
  for (const status of [401, 403]) {
    const response = await handleCreatorCredit(request(payload), "upman-one", {
      authorize: async () => ({ ok: false, response: new Response(null, { status }) }),
      transaction: () => { throw Error("unexpected transaction"); },
    });
    assert.equal(response.status, status);
  }
});

test("stale edits, mismatched verified login and serialization conflicts are rejected", async () => {
  const f = fixture();
  assert.equal((await f.run({ ...payload, twitchLogin: "someoneelse" })).status, 409);
  assert.equal((await f.run({ ...payload, expected: { ...empty, creator: "stale" } })).status, 409);
  f.failUpdate();
  assert.equal((await f.run(payload)).status, 409);
  assert.equal(f.writes.length, 0);
  assert.equal(f.logs.length, 0);
});

test("a public credit override remains local to an Upman and private profile data is excluded", () => {
  const legacy = { creator: "Public pseudonym", creatorTwitch: null };
  const person = { id: "person", displayName: "Profile name", isPublic: false,
    user: { twitchLogin: "private", avatar: "private" } };
  assert.deepEqual(resolvePublicCreatorIdentity(legacy, person),
    { displayName: "Public pseudonym", twitchLogin: null, avatar: null, source: "legacy" });
  assert.equal(resolvePublicCreatorIdentity(legacy, { ...person, isPublic: true }).displayName, "Public pseudonym");
});
