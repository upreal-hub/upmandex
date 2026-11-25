import { AUTH_STAGES, AUTH_ERROR_TYPES } from '../lib/auth-diagnostics.mjs';
// Operator-only: consume the exact deployment snapshot in memory, never print it.
export class VercelReadError extends Error {
  constructor(diagnostic) {
    super('Lecture Vercel bloquée : ' + diagnostic.category + ' (' + diagnostic.stage + '). Aucun transfert lancé.');
    this.diagnostic = diagnostic;
  }
}

export function summarizeAuthLogs(text) {
  const marked = /UPMANDEX_AUTH_DENIED|UPMANDEX_AUTH_DIAGNOSTIC/.test(text);
  const recordedStages = AUTH_STAGES.filter(stage => marked && text.includes(stage));
  const authErrors = AUTH_ERROR_TYPES.filter(type => marked && text.includes(type));
  const databaseCodes = [...new Set(text.match(/\bP\d{4}\b/g) ?? [])];
  const postgresCodes = [...new Set(text.match(/\b(?:08P01|08001|08006|28P01|42703|42P01|23505|40001)\b/g) ?? [])];
  return { accessDeniedSeen: /AccessDenied|Access Denied|UPMANDEX_AUTH_DENIED/.test(text), recordedStages, databaseCodes, postgresCodes, authErrors,
    diagnostic: recordedStages.length ? 'runtime-stage-recorded' : databaseCodes.length ? 'database-error-recorded' : 'precise-runtime-reason-not-recorded',
    rawLogsPrinted: false };
}

// Never include raw CLI stderr, response bodies, headers or environment values in diagnostics.
export function readVercelJson(result, stage) {
  const clean = value => String(value ?? '').replace(/\x1b\[[0-9;]*m/g, '');
  const stdout = clean(result.stdout);
  const stderr = clean(result.stderr);
  let body;
  try { body = JSON.parse(stdout.trim()); } catch {
    try { body = JSON.parse(stdout.slice(stdout.indexOf('{')).trim()); } catch { /* Classify below. */ }
  }
  const combined = stdout + '\n' + stderr;
  const status = Number(combined.match(/\bHTTP\/[\d.]+\s+(\d{3})\b/i)?.[1]
    ?? combined.match(/\b(?:status(?: code)?|http(?: error)?)\s*[:=]?\s*(\d{3})\b/i)?.[1]
    ?? body?.error?.statusCode ?? body?.error?.status ?? 0) || null;
  const code = String(body?.error?.code ?? '').toLowerCase();
  const failed = result.status !== 0 || result.error || body?.error || (status && status >= 400);
  if (!failed && body && typeof body === 'object') return body;
  let category = 'cli-failure';
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(combined)) category = 'dns';
  else if (result.error?.code === 'ETIMEDOUT' || result.signal || /ETIMEDOUT|ECONNRESET|ECONNREFUSED|fetch failed/i.test(combined)) category = 'network';
  else if (/CERT_|certificate|TLS|SSL/i.test(combined)) category = 'tls';
  else if (/sensitive|non.exportable|not exportable|cannot.*decrypt|cannot.*retrieve/i.test(combined)) category = 'secret-not-exportable';
  else if (status === 401 || ['unauthorized', 'invalid_token', 'not_authenticated'].includes(code) || /not logged in|no existing credentials|token.*expired/i.test(combined)) category = 'authentication';
  else if (status === 403 || ['forbidden', 'access_denied', 'missing_permission'].includes(code) || /permission|not authorized|forbidden|access denied/i.test(combined)) category = 'permissions';
  else if (status === 404 || ['not_found', 'deployment_not_found', 'project_not_found'].includes(code)) category = 'endpoint-or-target-not-found';
  else if (/unknown option|unexpected argument|invalid argument|unsupported.*method/i.test(combined)) category = 'cli-arguments';
  else if (!failed) category = 'unexpected-response-format';
  const diagnostic = { stage, category, httpStatus: status, cliExitCode: Number.isInteger(result.status) ? result.status : null };
  throw new VercelReadError(diagnostic);
}

export function mewSigningContext(snapshot, expectedOwnerId, localSecret) {
  const env = snapshot?.env;
  const secret = env?.AUTH_SECRET;
  if (typeof secret !== 'string' || !secret || /^\s*$/.test(secret)
    || /^\*+$/.test(secret) || /^\[.*(?:sensitive|redacted).*\]$/i.test(secret)) {
    throw new Error('AUTH_SECRET du déploiement non récupérable : aucune signature locale de secours, aucun transfert lancé.');
  }
  if (!/^[1-9]\d{0,29}$/.test(expectedOwnerId ?? '') || env.UPMANDEX_RELEASE_ADMIN_TWITCH_ID !== expectedOwnerId) {
    throw new Error('ID propriétaire différent entre la configuration privée et le déploiement : aucun transfert lancé.');
  }
  return { secret, ownerTwitchId: env.UPMANDEX_RELEASE_ADMIN_TWITCH_ID,
    localSecretMatchesDeployment: typeof localSecret === 'string' ? localSecret === secret : null };
}
