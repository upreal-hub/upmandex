import { randomUUID } from 'node:crypto';
import { OPERATION, MewError, requireMew as check, signMewRequest, authenticateMewRequest } from './mew-runtime-auth.mjs';

export function mewSessionAuthOrigin(env) {
  if (env.UPMANDEX_MEW_RUNTIME_ENABLED !== '1' && env.UPMANDEX_AUTH_DIAGNOSTIC !== '1') return null;
  check(env.VERCEL_ENV === 'production' && env.VERCEL_PROJECT_ID === 'prj_R6Hdw8elr07EAAOT50AGsRXnBC5O'
    && env.UPMANDEX_ENV === 'anniversary' && env.UPMANDEX_PRIVATE_ACCESS === '1'
    && /^upmandex-[a-z0-9]+-upreal-s-projects\.vercel\.app$/.test(env.VERCEL_URL ?? ''), 'Temporary deployment identity not confirmed', 503);
  return 'https://' + env.VERCEL_URL;
}

export function isMewPreparationTarget(env, target, now = Date.now()) {
  try {
    const url = new URL(env.DATABASE_URL ?? '');
    return env.UPMANDEX_MEW_RUNTIME_ENABLED === '1' && env.UPMANDEX_PRIVATE_ACCESS === '1'
      && env.UPMANDEX_RELEASE_READY === '0' && target?.branchName === 'anniversary'
      && Number.isSafeInteger(target.attestedAt) && now - target.attestedAt >= -5000 && now - target.attestedAt <= 86_400_000
      && url.protocol === 'postgresql:' && url.hostname.replace(/-pooler\./, '.') === target.databaseHost
      && url.pathname === '/' + target.databaseName && (!url.port || url.port === '5432')
      && [...url.searchParams.keys()].every(key => ['sslmode', 'channel_binding'].includes(key));
  } catch {
    return false;
  }
}

const preparationConfirmation = 'PREPARE TWO MEW';
const removalConfirmation = 'REMOVE TWO PUBLIC MEW';
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
  // A native form POST needs a non-opaque Origin. Send only the origin as the referrer.
  'Content-Security-Policy': "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'", 'Referrer-Policy': 'strict-origin' };

export function createMewSessionHandlers({ currentUser, run, target, env = process.env, now = Date.now }) {
  async function owner() {
    check(env.UPMANDEX_MEW_RUNTIME_ENABLED === '1', 'Operation disabled', 404);
    const user = await currentUser();
    check(user, 'Twitch authentication required', 401);
    check(user.role === 'ADMIN' && typeof user.id === 'string' && user.id.length > 0
      && /^[1-9]\d{0,29}$/.test(env.UPMANDEX_RELEASE_ADMIN_TWITCH_ID ?? '')
      && user.twitchUserId === env.UPMANDEX_RELEASE_ADMIN_TWITCH_ID, 'Primary administrator required', 403);
    check(target?.project === 'late-paper-17187204' && target?.branchName === 'anniversary', 'Pinned Anniversary target missing', 503);
    check(Number.isSafeInteger(target.attestedAt) && now() - target.attestedAt >= -5000
      && now() - target.attestedAt <= 24 * 60 * 60 * 1000, 'Deployment target attestation expired; no transfer permitted', 409);
    return user;
  }
  function payload(user, mode) {
    return { ...target, operation: OPERATION, mode, ownerTwitchId: user.twitchUserId, deploymentHost: env.VERCEL_URL,
      nonce: randomUUID(), issuedAt: now() };
  }
  function verified(value, signature) {
    const parsed = authenticateMewRequest(value, signature, env, now());
    check(parsed.deploymentHost === env.VERCEL_URL && parsed.branchId === target.branchId
      && parsed.databaseHost === target.databaseHost && parsed.databaseName === target.databaseName
      && JSON.stringify(parsed.sources) === JSON.stringify(target.sources), 'Pinned target mismatch', 403);
    return parsed;
  }
  function failure(error) {
    return Response.json({ outcome: 'blocked', diagnostic: error instanceof MewError ? error.message : 'Operation interrupted; no automatic retry.',
      ...(error?.progress ? { progress: error.progress } : {}), automaticRetry: false, domainChanged: false, publicReleaseTriggered: false },
      { status: error instanceof MewError ? error.status : 503, headers });
  }
  return {
    GET: async request => {
      try {
        const user = await owner();
        check(new URL(request.url).origin === mewSessionAuthOrigin(env), 'Use the isolated deployment URL', 403);
        const body = JSON.stringify(payload(user, 'check'));
        const state = await run(verified(body, signMewRequest(body, env.AUTH_SECRET)));
        const prepare = state.operationState === 'unclaimed';
        const remove = state.operationState === 'prepared' && env.UPMANDEX_MEW_DELETE_ENABLED === '1';
        const confirmation = prepare ? preparationConfirmation : removalConfirmation;
        const execute = payload(user, prepare ? 'execute' : 'delete');
        const { mode, nonce, issuedAt } = execute;
        const ticket = Buffer.from(JSON.stringify({ mode, nonce, issuedAt })).toString('base64url')
          + '.' + signMewRequest(JSON.stringify(execute), env.AUTH_SECRET);
        const form = prepare || remove ? `<form method="post"><input type="hidden" name="ticket" value="${escape(ticket)}"><label>Type ${confirmation}: <input name="confirmation" required autocomplete="off"></label><button>${prepare ? 'Prepare the two private copies' : 'Remove the two public originals'}</button></form><p>Confirmation expires in 90 seconds.</p>` : '<p>No action available. Refresh to read the saved state.</p>';
        return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><title>One-off MEW operation</title><h1>MEW private transfer</h1><pre>' + escape(JSON.stringify(state, null, 2)) + '</pre>' + form + '</html>',
          { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
      } catch (error) { return failure(error); }
    },
    POST: async request => {
      try {
        const user = await owner();
        const origin = mewSessionAuthOrigin(env);
        check(new URL(request.url).origin === origin && request.headers.get('origin') === origin, 'Same-origin confirmation required', 403);
        check(!request.headers.get('sec-fetch-site') || request.headers.get('sec-fetch-site') === 'same-origin', 'Cross-site request refused', 403);
        check(request.headers.get('content-type')?.split(';')[0] === 'application/x-www-form-urlencoded', 'Form confirmation required', 400);
        const reader = request.body?.getReader();
        check(reader, 'Body required', 400);
        let bytes = 0; const chunks = [];
        for (;;) { const part = await reader.read(); if (part.done) break; bytes += part.value.length;
          if (bytes > 8192) { await reader.cancel(); throw new MewError('Body too large', 413); } chunks.push(part.value); }
        const form = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
        check(form.getAll('confirmation').length === 1 && form.getAll('ticket').length === 1, 'Explicit confirmation required', 400);
        const parts = form.get('ticket').split('.');
        check(parts.length === 2 && /^[A-Za-z0-9_-]+$/.test(parts[0]), 'Invalid confirmation ticket', 403);
        let claims;
        try { claims = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); }
        catch { throw new MewError('Invalid confirmation ticket', 403); }
        check(claims && (claims.mode === 'execute' || claims.mode === 'delete'), 'Invalid confirmation ticket', 403);
        const body = JSON.stringify({ ...payload(user, claims.mode), nonce: claims.nonce, issuedAt: claims.issuedAt });
        const operation = verified(body, parts[1]);
        check((operation.mode === 'execute' || operation.mode === 'delete') && operation.ownerTwitchId === user.twitchUserId, 'Confirmation session mismatch', 403);
        check(form.get('confirmation') === (operation.mode === 'delete' ? removalConfirmation : preparationConfirmation), 'Explicit confirmation required', 400);
        return Response.json(await run(operation), { headers });
      } catch (error) { return failure(error); }
    },
  };
}
