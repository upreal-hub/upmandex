import assert from 'node:assert/strict';
import * as nodeModule from 'node:module';
import test from 'node:test';
import { summarizeAuthLogs } from '../tools/mew-signing-context.mjs';

test('read-only log summary never returns raw identities, URLs or exception text', () => {
  const result = summarizeAuthLogs('AccessDenied P2025 fixture-sensitive UPManDex https://private.example/secret UPMANDEX_AUTH_DENIED {"stage":"database-identity-resolution"}');
  assert.deepEqual(result.recordedStages, ['database-identity-resolution']);
  assert.deepEqual(result.databaseCodes, ['P2025']);
  assert.equal(JSON.stringify(result).includes('fixture-sensitive'), false);
  assert.equal(JSON.stringify(result).includes('private.example'), false);
  assert.equal(summarizeAuthLogs('AccessDenied').diagnostic, 'precise-runtime-reason-not-recorded');
});

test('actual signIn callback accepts the allowed linked owner and refuses outsiders without exposing identities', async context => {
  const fixture = { AUTH_SECRET: 'fixture-session-secret', AUTH_TWITCH_ID: 'fixture-client', AUTH_TWITCH_SECRET: 'fixture-client-secret',
    AUTH_URL: 'https://fixture.example.test', UPMANDEX_PRIVATE_ACCESS: '1', UPMANDEX_PRIVATE_TWITCH_IDS: '111',
    UPMANDEX_RELEASE_ADMIN_TWITCH_ID: '111', UPMANDEX_MEW_RUNTIME_ENABLED: '0',
    DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1:1/fixture' };
  const previous = Object.fromEntries(Object.keys(fixture).map(key => [key, process.env[key]]));
  Object.assign(process.env, fixture);
  type Resolve = (specifier: string, context: object) => object;
  const { registerHooks } = nodeModule as typeof nodeModule & { registerHooks(hooks: { resolve: (specifier: string, context: object, next: Resolve) => object }): { deregister(): void } };
  const hook = registerHooks({ resolve: (s, c, next) => next(s === 'server-only' ? 'next/dist/compiled/server-only/empty.js' : s, c) });
  try {
    const { authConfig } = await import('../auth');
    const { prisma } = await import('./prisma');
    const originalQuery = prisma.$queryRaw, originalTransaction = prisma.$transaction;
    let transactions = 0, fetches = 0;
    let throwDatabase = false;
    const logs: string[] = [];
    context.mock.method(console, 'warn', (...parts: unknown[]) => { logs.push(parts.join(' ')); });
    prisma.$queryRaw = (async () => [{ status: 'PRIVATE', version: 0 }]) as typeof prisma.$queryRaw;
    prisma.$transaction = (async (action: (tx: unknown) => unknown) => {
      transactions++;
      if (throwDatabase) throw Object.assign(new Error('fixture-private-detail-never-log'), { code: 'P2025' });
      return action({ user: {
        findUnique: async () => ({ id: 'owner-internal', role: 'ADMIN', twitchUserId: '111', twitchLogin: 'owner_fixture' }),
        update: async () => ({ id: 'owner-internal', twitchUserId: '111', twitchLogin: 'owner_fixture' }),
        create: () => assert.fail('Existing owner must never be recreated'),
      } });
    }) as unknown as typeof prisma.$transaction;
    context.mock.method(globalThis, 'fetch', async () => { fetches++; return Response.json({ data: [{ id: '111', login: 'owner_fixture', display_name: 'Owner' }] }); });
    try {
      const input = (id: string) => ({ user: { id: 'oidc-fixture' }, account: { provider: 'twitch', type: 'oidc' as const,
        providerAccountId: id, access_token: 'fixture-token-never-log' } });
      assert.equal(await authConfig.callbacks.signIn(input('111')), true);
      assert.equal(transactions, 1);
      assert.equal(await authConfig.callbacks.signIn(input('222')), false);
      assert.equal(transactions, 1);
      assert.equal(fetches, 1);
      assert.ok(logs.some(line => line.includes('private-not-allowed') && line.includes('"ownerIdMatches":false')));
      // A missing Production allowlist must remain a refusal, including for the owner.
      delete process.env.UPMANDEX_PRIVATE_TWITCH_IDS;
      assert.equal(await authConfig.callbacks.signIn(input('111')), false);
      assert.ok(logs.some(line => line.includes('private-not-allowed') && line.includes('"ownerIdMatches":true')));
      process.env.UPMANDEX_PRIVATE_TWITCH_IDS = '111';
      throwDatabase = true;
      await assert.rejects(authConfig.callbacks.signIn(input('111')));
      assert.ok(logs.some(line => line.includes('database-identity-resolution') && line.includes('P2025')));
      for (const secret of ['fixture-token-never-log', 'fixture-private-detail-never-log', 'owner-internal', 'owner_fixture', '"111"', '"222"']) {
        assert.equal(logs.some(line => line.includes(secret)), false);
      }
    } finally { prisma.$queryRaw = originalQuery; prisma.$transaction = originalTransaction; }
  } finally {
    hook.deregister();
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
