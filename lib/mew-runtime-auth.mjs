import { createHmac, timingSafeEqual } from 'node:crypto';

export const MEW_IDS = ['cmvjhhfll000008i1m8vp5zz8', 'cmvjhi0t9000308i14kb6793j'];
export const PUBLIC_STORE_ID = 'e4pburhj5wrv8agh';
export const OPERATION = 'upmandex:mew-private-transfer:v1';
export class MewError extends Error {
  constructor(message, status = 409) { super(message); this.status = status; }
}
export function requireMew(value, message, status = 409) { if (!value) throw new MewError(message, status); }
export function signMewRequest(body, secret) {
  return createHmac('sha256', createHmac('sha256', secret).update(OPERATION).digest()).update(body).digest('hex');
}
export function authenticateMewRequest(body, signature, env, now = Date.now()) {
  requireMew(env.UPMANDEX_MEW_RUNTIME_ENABLED === '1', 'Operation disabled', 404);
  requireMew(env.AUTH_SECRET && typeof signature === 'string' && /^[a-f0-9]{64}$/.test(signature), 'Owner signature required', 401);
  requireMew(timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(signMewRequest(body, env.AUTH_SECRET), 'hex')), 'Invalid owner signature', 401);
  let payload;
  try { payload = JSON.parse(body); } catch { throw new MewError('Invalid request', 400); }
  requireMew(payload.operation === OPERATION && ['check', 'execute', 'delete'].includes(payload.mode)
    && /^[a-f0-9-]{36}$/.test(payload.nonce ?? '') && Number.isSafeInteger(payload.issuedAt)
    && now - payload.issuedAt >= -5000 && now - payload.issuedAt <= 90_000, 'Expired or invalid scoped request', 401);
  requireMew(/^[1-9]\d{0,29}$/.test(env.UPMANDEX_RELEASE_ADMIN_TWITCH_ID ?? '')
    && payload.ownerTwitchId === env.UPMANDEX_RELEASE_ADMIN_TWITCH_ID, 'Primary owner required', 403);
  requireMew(payload.project === 'late-paper-17187204' && /^br-[a-z0-9-]+$/.test(payload.branchId ?? '')
    && /^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)*\.neon\.tech$/.test(payload.databaseHost ?? '')
    && payload.databaseName === 'neondb', 'Target attestation invalid', 403);
  requireMew(payload.sources?.length === 2 && MEW_IDS.every(id => payload.sources.filter(row => row.id === id).length === 1), 'Only the two approved MEW IDs are permitted', 403);
  requireMew(payload.mode !== 'delete' || env.UPMANDEX_MEW_DELETE_ENABLED === '1', 'Public original removal is disabled', 403);
  for (const row of payload.sources) {
    let url;
    try { url = new URL(row.publicUrl); } catch { throw new MewError('Invalid source', 403); }
    requireMew(url.origin === `https://${PUBLIC_STORE_ID}.public.blob.vercel-storage.com`
      && url.pathname.startsWith('/upman-submissions/') && !url.search && !url.hash && !url.username && !url.password, 'Invalid source', 403);
  }
  return payload;
}
export function privateMewStore(env) {
  const token = env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  requireMew(typeof token === 'string' && /^vercel_blob_rw_[a-zA-Z0-9]+_/.test(token),
    'PRIVATE_BLOB_READ_WRITE_TOKEN unavailable or invalid in Production runtime', 503);
  const id = token.split('_')[3]; // Same read-write-token store resolution as installed @vercel/blob.
  requireMew(id !== PUBLIC_STORE_ID && (!env.PRIVATE_BLOB_STORE_ID || env.PRIVATE_BLOB_STORE_ID.replace(/^store_/, '') === id), 'Private/public store identity conflict', 503);
  return { id, options: { token, storeId: id }, origin: `https://${id}.private.blob.vercel-storage.com` };
}

export async function verifyListedPrivateBlob(blobs, store, getBlob) {
  const sample = blobs[0];
  if (!sample) return false;
  const pathname = sample.pathname;
  requireMew(typeof pathname === 'string' && pathname.length > 0 && !pathname.startsWith('/')
    && !/[:?#\\]/.test(pathname) && !pathname.split('/').some(part => part === '.' || part === '..'),
  'Invalid pathname in private store listing', 503);
  let result;
  try {
    result = await getBlob(pathname, { ...store.options, access: 'private', useCache: false, abortSignal: AbortSignal.timeout(8000) });
    requireMew(result?.statusCode === 200 && result.stream, 'Listed private Blob could not be read', 503);
    requireMew(new URL(result.blob.url).origin === store.origin && result.blob.pathname === pathname
      && (!sample.etag || sample.etag === result.blob.etag), 'Listed Blob does not match the expected private store object', 503);
    return true;
  } catch (error) {
    if (error instanceof MewError) throw error;
    throw new MewError('Private store sample verification failed', 503);
  } finally {
    await result?.stream?.cancel().catch(() => {});
  }
}

export function assertPrimaryMewAdmin(user) {
  requireMew(user?.role === 'ADMIN' && typeof user.id === 'string' && user.id.length > 0, 'Owner is not a linked administrator', 403);
}

export async function claimMewOperation(putBlob, pathname, body, privateOptions) {
  return putBlob(pathname, JSON.stringify(body), { ...privateOptions, access: 'private', addRandomSuffix: false,
    allowOverwrite: false, contentType: 'application/json', cacheControlMaxAge: 60 });
}

export function mewProgress(marker) {
  return { phase: marker.failedDuring ?? marker.state, copiesCreated: marker.copies?.length ?? 0,
    privateCopiesVerified: marker.privateCopiesVerified ?? 0, accessVerified: marker.accessVerified === true,
    referencesPrivate: marker.referencesPrivate === true, referencesRestored: marker.referencesRestored === true,
    originalsDeletedConfirmed: marker.deleted?.length ?? 0, deletionOutcomeUncertain: Boolean(marker.attemptingDelete) };
}

/**
 * @param {object} actions
 * @param {{ prepareOnly?: boolean, preparedCopies?: unknown[] | null }} [options]
 */
export async function performMewTransfer(actions, options = {}) {
  const { prepareOnly = false, preparedCopies = null } = options;
  const copies = preparedCopies ?? await actions.copyAndVerify();
  if (!preparedCopies) await actions.replaceReferences(copies);
  let deleting = false;
  try {
    await actions.verifyAccess(copies);
    await actions.lockAndValidateDeletion(copies);
    if (prepareOnly) return { outcome: 'mew-prepared' };
    deleting = true;
    await actions.deleteOriginals(copies);
    return await actions.verifyRevocation(copies);
  } catch (error) {
    if (!deleting && !preparedCopies) await actions.restoreReferences(copies);
    throw error;
  } finally { await actions.releaseLocks(); }
}
