import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTH_STAGES, logAuthDiagnostic, logAuthJsError, privateConfigInvalid } from './auth-diagnostics.mjs';
import { summarizeAuthLogs } from '../tools/mew-signing-context.mjs';

test('all runtime diagnostic categories survive Vercel JSONL escaping and never expose private context', context => {
  const messages: string[] = [];
  context.mock.method(console, 'warn', (...args: unknown[]) => messages.push(args.join(' ')));
  for (const stage of AUTH_STAGES) logAuthDiagnostic(stage, '987654321', { code: 'fixture-token', token: 'fixture-secret', cookie: 'fixture-cookie' });
  logAuthJsError({ type: 'OAuthCallbackError', message: 'fixture-personal-data', stack: 'fixture-private-stack',
    cause: { err: { code: '28P01', message: 'fixture-password', headers: { cookie: 'fixture-cookie' } } } });
  logAuthJsError({ type: 'AccessDenied', cause: { err: { code: 'P2025', message: 'fixture-personal-data' } } });
  const jsonl = messages.map(message => JSON.stringify({ message, requestPath: '/api/auth/callback/twitch' })).join('\n');
  const summary = summarizeAuthLogs(jsonl);
  assert.deepEqual(summary.recordedStages, AUTH_STAGES);
  assert.ok(summary.authErrors.includes('OAuthCallbackError'));
  assert.ok(summary.authErrors.includes('AccessDenied'));
  assert.deepEqual(summary.databaseCodes, ['P2025']);
  assert.deepEqual(summary.postgresCodes, ['28P01']);
  assert.equal(summary.diagnostic, 'runtime-stage-recorded');
  for (const secret of ['987654321', 'fixture-token', 'fixture-secret', 'fixture-cookie', 'fixture-personal-data', 'fixture-private-stack', 'fixture-password']) {
    assert.equal(jsonl.includes(secret), false);
    assert.equal(JSON.stringify(summary).includes(secret), false);
  }
});

test('PRIVATE configuration diagnostics distinguish malformed settings without granting access', () => {
  const valid = { VERCEL: '1', UPMANDEX_ENV: 'anniversary', UPMANDEX_PRIVATE_ACCESS: '1',
    UPMANDEX_RELEASE_ADMIN_TWITCH_ID: '111', UPMANDEX_PRIVATE_TWITCH_IDS: '111,222' };
  assert.equal(privateConfigInvalid(valid), false);
  for (const patch of [{ UPMANDEX_PRIVATE_TWITCH_IDS: '' }, { UPMANDEX_PRIVATE_TWITCH_IDS: '222' },
    { UPMANDEX_PRIVATE_TWITCH_IDS: '[111]' }, { UPMANDEX_RELEASE_ADMIN_TWITCH_ID: '' },
    { UPMANDEX_PRIVATE_ACCESS: '0' }, { UPMANDEX_ENV: 'other' }]) assert.equal(privateConfigInvalid({ ...valid, ...patch }), true);
});
