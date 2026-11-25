export const AUTH_STAGES = [
  'account-incomplete', 'auth-config-incomplete', 'private-config-invalid', 'private-not-allowed', 'helix-http-refused', 'helix-unreachable',
  'helix-identity-mismatch', 'invalid-twitch-login', 'database-identity-resolution', 'database-identity-conflict',
  'owner-admin-not-found', 'owner-admin-not-linked', 'owner-account-not-admin', 'owner-admin-verified',
  'jwt-private-not-allowed', 'authjs-error', 'authjs-warning', 'unclassified',
];
export const AUTH_ERROR_TYPES = ['AccessDenied', 'OAuthCallbackError', 'OAuthSignInError', 'CallbackRouteError',
  'JWTSessionError', 'SessionTokenError', 'MissingSecret', 'UntrustedHost', 'InvalidCheck', 'Configuration', 'Unknown'];
export function safeAuthCode(code) {
  return typeof code === 'string' && /^(P\d{4}|\d{2}[A-Z0-9]{3}|ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT|[1-5]\d{2})$/.test(code) ? code : undefined;
}
/** @param {string} stage @param {string|null} [twitchUserId] @param {{code?: unknown, authError?: string, [key: string]: unknown}} [details] */
export function logAuthDiagnostic(stage, twitchUserId = null, details = {}) {
  const record = { version: 1, stage: AUTH_STAGES.includes(stage) ? stage : 'unclassified',
    ownerIdMatches: Boolean(twitchUserId && twitchUserId === process.env.UPMANDEX_RELEASE_ADMIN_TWITCH_ID),
    ...(safeAuthCode(details.code) ? { code: safeAuthCode(details.code) } : {}),
    ...(AUTH_ERROR_TYPES.includes(details.authError) ? { authError: details.authError } : {}) };
  console.warn('UPMANDEX_AUTH_DIAGNOSTIC', JSON.stringify(record));
}
export function logAuthJsError(error) {
  const candidates = [error, error?.cause, error?.cause?.err, error?.cause?.cause, error?.cause?.err?.cause];
  const code = candidates.flatMap(value => [value?.code, value?.errorCode, value?.originalCode]).map(safeAuthCode).find(Boolean);
  logAuthDiagnostic('authjs-error', null, { code,
    authError: AUTH_ERROR_TYPES.includes(error?.type) ? error.type : 'Unknown' });
}
export function privateConfigInvalid(env) {
  const owner = env.UPMANDEX_RELEASE_ADMIN_TWITCH_ID;
  const members = (env.UPMANDEX_PRIVATE_TWITCH_IDS ?? '').split(',').map(id => id.trim());
  return (env.VERCEL === '1' && (env.UPMANDEX_ENV !== 'anniversary' || env.UPMANDEX_PRIVATE_ACCESS !== '1'))
    || !/^[1-9]\d{0,29}$/.test(owner ?? '') || !members.length || members.some(id => !/^\d+$/.test(id)) || !members.includes(owner);
}
