import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { createMewSessionHandlers, mewSessionAuthOrigin } from './mew-session-operation.mjs';
import { MEW_IDS, MewError, mewProgress, performMewTransfer } from './mew-runtime-auth.mjs';

const env = { NODE_ENV: 'test' as const, AUTH_SECRET: 'runtime-fixture-only', UPMANDEX_MEW_RUNTIME_ENABLED: '1', UPMANDEX_RELEASE_ADMIN_TWITCH_ID: '111',
  VERCEL_ENV: 'production', VERCEL_PROJECT_ID: 'prj_R6Hdw8elr07EAAOT50AGsRXnBC5O', VERCEL_URL: 'upmandex-fixture-upreal-s-projects.vercel.app',
  UPMANDEX_ENV: 'anniversary', UPMANDEX_PRIVATE_ACCESS: '1' };
const origin = 'https://' + env.VERCEL_URL;
const url = origin + '/api/operations/mew-private-transfer';
const target = { project: 'late-paper-17187204', branchName: 'anniversary', branchId: 'br-fixture', databaseName: 'neondb',
  databaseHost: 'ep-fixture.region.neon.tech', attestedAt: 100000,
  sources: MEW_IDS.map((id, n) => ({ id, publicUrl: `https://e4pburhj5wrv8agh.public.blob.vercel-storage.com/upman-submissions/fixture-${n}.png` })) };
const primary = { id: 'owner-user', role: 'ADMIN', twitchUserId: '111' };
function setup() {
  let user: typeof primary | null = primary;
  let clock = 100000; let claimed = false;
  const calls: string[] = [];
  const handlers = createMewSessionHandlers({ env, target, now: () => clock, currentUser: async () => user, run: async (payload: { mode: string; sources: unknown[] }) => {
    calls.push(payload.mode);
    assert.deepEqual(payload.sources, target.sources);
    if (payload.mode === 'check') return { operationState: claimed ? 'complete' : 'unclaimed', runtimeTokenPresent: true };
    if (claimed) throw new MewError('Operation already claimed', 409);
    claimed = true;
    return { outcome: 'mew-prepared', originalsDeleted: 0 };
  } });
  return { handlers, calls, setUser: (next: typeof primary | null) => { user = next; }, setClock: (next: number) => { clock = next; } };
}
async function ticket(handlers: ReturnType<typeof setup>['handlers']) {
  const response = await handlers.GET(new Request(url));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin');
  const html = await response.text();
  assert.equal(html.includes(env.AUTH_SECRET), false);
  const token = html.match(/name="ticket" value="([^"]+)"/)?.[1];
  assert.ok(token);
  const claims = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
  assert.deepEqual(Object.keys(claims), ['mode', 'nonce', 'issuedAt']);
  return token;
}
const post = (token: string, extraHeaders = {}, confirmation = 'PREPARE TWO MEW') => new Request(url, { method: 'POST',
  headers: { origin, 'sec-fetch-site': 'same-origin', ...extraHeaders }, body: new URLSearchParams({ ticket: token, confirmation }) });

test('temporary OAuth origin changes only for the verified isolated operation deployment', () => {
  assert.equal(mewSessionAuthOrigin({}), null);
  assert.equal(mewSessionAuthOrigin(env), origin);
  assert.equal(mewSessionAuthOrigin({ ...env, UPMANDEX_MEW_RUNTIME_ENABLED: '0', UPMANDEX_AUTH_DIAGNOSTIC: '1' }), origin);
  for (const patch of [{ VERCEL_PROJECT_ID: 'other' }, { VERCEL_ENV: 'preview' }, { VERCEL_URL: 'upmandex.com' },
    { VERCEL_URL: 'evil.example' }, { UPMANDEX_PRIVATE_ACCESS: '0' }]) assert.throws(() => mewSessionAuthOrigin({ ...env, ...patch }));
});
test('real Auth.js uses the generated Twitch callback only on the temporary deployment', () => {
  const script = `
    import assert from 'node:assert/strict';
    import { registerHooks } from 'node:module';
    import { NextRequest } from 'next/server';
    const hook = registerHooks({ resolve(s,c,next) { return next(s==='server-only'?'next/dist/compiled/server-only/empty.js':s,c); } });
    const {handlers} = await import('./auth.ts');
    const origin = process.env.UPMANDEX_MEW_RUNTIME_ENABLED === '1' || process.env.UPMANDEX_AUTH_DIAGNOSTIC === '1' ? 'https://' + process.env.VERCEL_URL : 'https://upmandex.com';
    assert.equal(process.env.AUTH_URL, origin);
    const csrf=await handlers.GET(new NextRequest(origin+'/api/auth/csrf'));
    const {csrfToken}=await csrf.json();
    const cookie=csrf.headers.getSetCookie().find(v=>v.startsWith('__Host-authjs.csrf-token='));
    assert.ok(cookie);
    globalThis.fetch=async(input)=>{
      assert.equal(String(input),'https://id.twitch.tv/oauth2/.well-known/openid-configuration');
      return Response.json({issuer:'https://id.twitch.tv/oauth2',authorization_endpoint:'https://id.twitch.tv/oauth2/authorize',token_endpoint:'https://id.twitch.tv/oauth2/token'});
    };
    const response=await handlers.POST(new NextRequest(origin+'/api/auth/signin/twitch',{method:'POST',headers:{cookie:cookie.split(';')[0]},body:new URLSearchParams({csrfToken,callbackUrl:origin})}));
    assert.equal(new URL(response.headers.get('location')).searchParams.get('redirect_uri'),origin+'/api/auth/callback/twitch');
    hook.deregister();
    console.log('oauth-origin-passed');
  `;
  for (const [flag, diagnostic] of [['0', '0'], ['1', '0'], ['0', '1']]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
      cwd: process.cwd(), encoding: 'utf8', timeout: 20000,
      env: { ...process.env, ...env, UPMANDEX_MEW_RUNTIME_ENABLED: flag, UPMANDEX_AUTH_DIAGNOSTIC: diagnostic, AUTH_URL: 'https://upmandex.com',
        NEXTAUTH_URL: 'https://upmandex.com', AUTH_TWITCH_ID: 'fixture', AUTH_TWITCH_SECRET: 'fixture',
        DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1:1/fixture' },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /oauth-origin-passed/);
  }
});
test('diagnostic deployment disables both MEW handlers before accessing storage or database', async () => {
  const handlers = createMewSessionHandlers({ env: { ...env, UPMANDEX_MEW_RUNTIME_ENABLED: '0', UPMANDEX_AUTH_DIAGNOSTIC: '1' }, target,
    currentUser: async () => assert.fail('No identity lookup on disabled MEW operation'), run: async () => assert.fail('No MEW runtime call') });
  assert.equal((await handlers.GET(new Request(url))).status, 404);
  assert.equal((await handlers.POST(post('unused'))).status, 404);
});
test('both handlers reject anonymous users, ordinary users and other administrators before touching media', async () => {
  for (const user of [null, { ...primary, role: 'USER' }, { ...primary, twitchUserId: '222' }]) {
    const setupResult = setup(); setupResult.setUser(user);
    for (const response of [await setupResult.handlers.GET(new Request(url)), await setupResult.handlers.POST(post('invalid'))]) {
      assert.equal(response.status, user ? 403 : 401);
    }
    assert.deepEqual(setupResult.calls, []);
  }
});
test('session-bound form requires same origin, explicit confirmation and an unmodified unexpired server ticket', async () => {
  const s = setup(); const token = await ticket(s.handlers);
  for (const [request, status] of [[post(token, { origin: 'https://evil.example' }), 403],
    [post(token, { origin: 'null' }), 403],
    [post(token, { 'sec-fetch-site': 'cross-site' }), 403], [post(token, {}, 'no'), 400],
    [post(token.slice(0, -1) + (token.endsWith('0') ? '1' : '0')), 401]] as const) {
    assert.equal((await s.handlers.POST(request)).status, status);
  }
  s.setClock(190001);
  assert.equal((await s.handlers.POST(post(token))).status, 401);
  assert.deepEqual(s.calls, ['check']);
});
test('explicit owner confirmation executes once; concurrent and later replays cannot execute again', async () => {
  const s = setup(); const token = await ticket(s.handlers);
  const responses = await Promise.all([s.handlers.POST(post(token)), s.handlers.POST(post(token))]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  assert.equal((await s.handlers.POST(post(token))).status, 409);
  const final = await s.handlers.GET(new Request(url));
  assert.equal((await final.text()).includes('<form'), false);
});
test('role revocation, missing target and expired target attestation fail closed', async () => {
  const s = setup(); const token = await ticket(s.handlers);
  s.setUser({ ...primary, role: 'USER' });
  assert.equal((await s.handlers.POST(post(token))).status, 403);
  s.setUser(primary); s.setClock(100000 + 86400001);
  assert.equal((await s.handlers.POST(post(token))).status, 409);
  const missing = createMewSessionHandlers({ env, target: null, currentUser: async () => primary, run: async () => { throw Error('must not run'); } });
  assert.equal((await missing.GET(new Request(url))).status, 503);
});
test('a prepared operation requires a separate, explicitly enabled removal ticket', async () => {
  const calls: string[] = [];
  const configured: NodeJS.ProcessEnv = { ...env, UPMANDEX_MEW_DELETE_ENABLED: '1' };
  const handlers = createMewSessionHandlers({ env: configured, target, currentUser: async () => primary,
    now: () => 100000, run: async (payload: { mode: string }) => {
      calls.push(payload.mode);
      return { operationState: 'prepared' };
    } });
  const token = await ticket(handlers);
  assert.equal((await handlers.POST(post(token))).status, 400);
  configured.UPMANDEX_MEW_DELETE_ENABLED = '0';
  assert.equal((await handlers.POST(post(token, {}, 'REMOVE TWO PUBLIC MEW'))).status, 403);
  assert.doesNotMatch(await (await handlers.GET(new Request(url))).text(), /<form/);
  assert.deepEqual(calls, ['check', 'check']);
});
test('deletion failure preserves private references and reports partial or uncertain state, never success', async () => {
  const calls: string[] = [];
  const failure = Object.assign(new MewError('Deletion interrupted', 503), { progress: mewProgress({ state: 'failed', failedDuring: 'deleting', copies: [{}, {}], privateCopiesVerified: 2,
    accessVerified: true, referencesPrivate: true, deleted: [MEW_IDS[0]], attemptingDelete: MEW_IDS[1] }) });
  await assert.rejects(performMewTransfer({ copyAndVerify: async () => [], replaceReferences: async () => {}, verifyAccess: async () => {},
    lockAndValidateDeletion: async () => {}, deleteOriginals: async () => { throw failure; },
    restoreReferences: async () => { calls.push('unsafe-restore'); }, verifyRevocation: async () => { calls.push('false-success'); },
    releaseLocks: async () => { calls.push('unlock'); } }));
  assert.deepEqual(calls, ['unlock']);
  const handlers = createMewSessionHandlers({ env, target, currentUser: async () => primary, now: () => 100000,
    run: async (p: { mode: string }) => { if (p.mode === 'check') return { operationState: 'unclaimed' }; throw failure; } });
  const response = await handlers.POST(post(await ticket(handlers)));
  const result = await response.json();
  assert.equal(response.status, 503);
  assert.equal(result.outcome, 'blocked');
  assert.equal(result.progress.originalsDeletedConfirmed, 1);
  assert.equal(result.progress.deletionOutcomeUncertain, true);
  assert.equal(result.progress.referencesPrivate, true);
  assert.equal(result.publicReleaseTriggered, false);
});
