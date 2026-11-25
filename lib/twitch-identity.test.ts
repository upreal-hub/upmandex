import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import test from "node:test";
import type { Prisma } from "@/app/generated/prisma/client";

// The project uses Node 20 type definitions. This test runs under Node 24.
type Resolve = (specifier: string, context: object) => object;
const { registerHooks } = nodeModule as typeof nodeModule & {
  registerHooks(options: { resolve: (specifier: string, context: object, next: Resolve) => object }):
    { deregister(): void };
};
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "server-only" ? "next/dist/compiled/server-only/empty.js" : specifier, context);
  },
});
const resolver = import("./twitch-identity").finally(() => hook.deregister());

const identity = { twitchUserId: "12345", twitchLogin: "newlogin", displayName: "New Login" };

function fixture(linkedId: string | null, role: "USER" | "ADMIN", login = identity.twitchLogin) {
  const row = { id: "internal", twitchUserId: linkedId, twitchLogin: login, role };
  const updates: unknown[] = [];
  const tx = {
    user: {
      findUnique: async ({ where }: { where: { twitchUserId?: string; twitchLogin?: string } }) =>
        (where.twitchUserId ? where.twitchUserId === row.twitchUserId : where.twitchLogin === row.twitchLogin)
          ? row : null,
      update: async (input: { data: typeof identity }) => {
        updates.push(input);
        return { ...row, ...input.data };
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { tx, updates };
}

test("a Twitch rename retains the existing account by stable ID", async () => {
  const { resolveTwitchIdentity } = await resolver;
  const { tx, updates } = fixture("12345", "ADMIN", "oldlogin");
  const result = await resolveTwitchIdentity(tx, identity);
  assert.equal(result.status, "resolved");
  assert.equal(result.status === "resolved" && result.user.id, "internal");
  assert.equal(updates.length, 1);
});

test("a new OAuth identity creates one viewer and subsequent callbacks reuse it", async () => {
  const { resolveTwitchIdentity } = await resolver;
  let row: (typeof identity & { id: string; role: "USER" }) | null = null;
  let creates = 0;
  const tx = {
    user: {
      findUnique: async ({ where }: { where: { twitchUserId?: string; twitchLogin?: string } }) =>
        row && (where.twitchUserId === row.twitchUserId || where.twitchLogin === row.twitchLogin) ? row : null,
      create: async ({ data }: { data: typeof identity & { role?: string } }) => {
        assert.equal(data.role, undefined);
        creates++;
        row = { ...data, id: "new-internal-id", role: "USER" };
        return row;
      },
      update: async () => row,
    },
  } as unknown as Prisma.TransactionClient;
  assert.equal((await resolveTwitchIdentity(tx, identity)).status, "resolved");
  const second = await resolveTwitchIdentity(tx, identity);
  assert.equal(second.status === "resolved" && second.user.id, "new-internal-id");
  assert.equal(creates, 1);
});

test("historical users bind with a guarded update, while mismatched IDs are rejected", async () => {
  const { resolveTwitchIdentity } = await resolver;
  const historical = fixture(null, "USER");
  assert.equal((await resolveTwitchIdentity(historical.tx, identity)).status, "resolved");
  assert.deepEqual(historical.updates, [{
    where: { id: "internal", AND: { twitchUserId: null, role: "USER" } },
    data: identity,
    select: { id: true, twitchLogin: true, twitchUserId: true },
  }]);
  const conflict = fixture("99999", "USER");
  assert.equal((await resolveTwitchIdentity(conflict.tx, identity)).status, "identity-conflict");
  assert.equal(conflict.updates.length, 0);
});

test("a historical admin cannot bind by login alone", async () => {
  const { resolveTwitchIdentity } = await resolver;
  const { tx, updates } = fixture(null, "ADMIN");
  const old = process.env.UPMANDEX_ADMIN_TWITCH_ID;
  try {
    delete process.env.UPMANDEX_ADMIN_TWITCH_ID;
    assert.equal((await resolveTwitchIdentity(tx, identity)).status, "identity-conflict");
    assert.equal(updates.length, 0);
    process.env.UPMANDEX_ADMIN_TWITCH_ID = identity.twitchUserId;
    assert.equal((await resolveTwitchIdentity(tx, identity)).status, "resolved");
  } finally {
    if (old === undefined) delete process.env.UPMANDEX_ADMIN_TWITCH_ID;
    else process.env.UPMANDEX_ADMIN_TWITCH_ID = old;
  }
});

test("diagnosing linked or historical administrators does not change identity resolution", async () => {
  const { resolveTwitchIdentity } = await resolver;
  const linked = fixture('12345', 'ADMIN');
  const stages: string[] = [];
  assert.equal((await resolveTwitchIdentity(linked.tx, identity, stage => stages.push(stage))).status, 'resolved');
  assert.deepEqual(stages, ['owner-admin-verified']);
  const historical = fixture(null, 'ADMIN');
  const old = process.env.UPMANDEX_ADMIN_TWITCH_ID;
  try {
    delete process.env.UPMANDEX_ADMIN_TWITCH_ID;
    assert.equal((await resolveTwitchIdentity(historical.tx, identity, stage => stages.push(stage))).status, 'identity-conflict');
    assert.equal(stages.at(-1), 'owner-admin-not-linked');
    assert.equal(historical.updates.length, 0);
  } finally { if (old === undefined) delete process.env.UPMANDEX_ADMIN_TWITCH_ID; else process.env.UPMANDEX_ADMIN_TWITCH_ID = old; }
});

test("an occupied login cannot move a stable account or its inventory to another row", async () => {
  const { resolveTwitchIdentity } = await resolver;
  const tx = {
    user: {
      findUnique: async ({ where }: { where: { twitchUserId?: string } }) => where.twitchUserId
        ? { id: "original", twitchUserId: "12345", twitchLogin: "oldlogin", role: "USER" }
        : { id: "occupied", twitchUserId: null, twitchLogin: "newlogin", role: "USER" },
      update: () => assert.fail("A collision must not trigger an update"),
      create: () => assert.fail("A collision must not create an account"),
    },
  } as unknown as Prisma.TransactionClient;
  assert.deepEqual(await resolveTwitchIdentity(tx, identity), { status: "identity-conflict" });
});
