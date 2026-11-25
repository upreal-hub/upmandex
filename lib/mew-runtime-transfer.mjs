import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import pg from 'pg';
import { put, get, del, list } from '@vercel/blob';
import { submissionMediaResponse } from './submission-media-response';
import { MEW_IDS, PUBLIC_STORE_ID, MewError, requireMew as check, privateMewStore, verifyListedPrivateBlob, performMewTransfer, assertPrimaryMewAdmin, claimMewOperation, mewProgress } from './mew-runtime-auth.mjs';

const markerPath = 'upman-submissions/private-mew/operation-v1.json';
const sha = value => createHash('sha256').update(value).digest('hex');
export async function runRuntimeMew(payload, env = process.env) {
  check(env.VERCEL_ENV === 'production' && env.UPMANDEX_ENV === 'anniversary' && env.UPMANDEX_PRIVATE_ACCESS === '1', 'Production PRIVATE environment required', 503);
  check(env.VERCEL_PROJECT_ID === 'prj_R6Hdw8elr07EAAOT50AGsRXnBC5O'
    && env.VERCEL_URL === payload.deploymentHost, 'Deployment identity mismatch', 403);
  const database = new URL(env.DATABASE_URL ?? '');
  check(database.protocol === 'postgresql:' && database.hostname.replace(/^([^.]+?)-pooler\./, '$1.') === payload.databaseHost
    && database.pathname === '/neondb' && (!database.port || database.port === '5432') && database.username && database.password, 'Database differs from fresh Neon attestation', 503);
  const store = privateMewStore(env);
  const privateOptions = store.options;
  const publicOptions = env.BLOB_READ_WRITE_TOKEN?.split('_')[3] === PUBLIC_STORE_ID
    ? { token: env.BLOB_READ_WRITE_TOKEN, storeId: PUBLIC_STORE_ID } : { storeId: PUBLIC_STORE_ID };
  const client = new pg.Client({ host: database.hostname, port: 5432, database: 'neondb',
    user: decodeURIComponent(database.username), password: decodeURIComponent(database.password),
    ssl: { rejectUnauthorized: true, servername: database.hostname }, enableChannelBinding: true,
    options: '-c default_transaction_read_only=on', connectionTimeoutMillis: 10_000, statement_timeout: 15_000 });
  const markerUrl = store.origin + '/' + markerPath;
  let marker, etag, claimed = false;
  async function readBlob(url, access, options, max = 4 * 1024 * 1024) {
    if (access === 'public') {
      const response = await fetch(url, { cache: 'no-store', redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(8000) });
      const length = Number(response.headers.get('content-length'));
      const publicEtag = response.headers.get('etag');
      if (!response.ok || !Number.isInteger(length) || length <= 0 || length > max || !publicEtag) {
        await response.body?.cancel();
        throw new MewError('Public original size or version unavailable', 503);
      }
      const data = Buffer.from(await response.arrayBuffer());
      check(data.length === length, 'Incomplete public Blob read');
      return { data, hash: sha(data), etag: publicEtag };
    }
    const blob = await get(url, { ...options, access, useCache: false });
    check(blob?.statusCode === 200 && blob.blob.size > 0 && blob.blob.size <= max, 'Blob unavailable or invalid size');
    const data = Buffer.from(await new Response(blob.stream).arrayBuffer());
    check(data.length === blob.blob.size, 'Incomplete Blob read');
    return { data, hash: sha(data), etag: blob.blob.etag };
  }
  async function save() {
    const saved = await put(markerPath, JSON.stringify(marker), { ...privateOptions, access: 'private', addRandomSuffix: false,
      allowOverwrite: Boolean(etag), ...(etag ? { ifMatch: etag } : {}), contentType: 'application/json', cacheControlMaxAge: 60 });
    check(new URL(saved.url).origin === store.origin, 'Private marker store mismatch');
    etag = saved.etag;
  }
  async function noReferences(allowTargets) {
    const urls = payload.sources.map(row => row.publicUrl);
    for (const [table, column] of [['Upman', 'image'], ['UpmanSubmission', 'image'], ['PersonArtwork', 'image'], ['ProfileCosmeticAsset', 'image'], ['PullEvent', 'upmanImage']]) {
      const rows = (await client.query(`SELECT id FROM public."${table}" WHERE "${column}"=ANY($1::text[])`, [urls])).rows;
      check(allowTargets ? rows.every(row => table === 'UpmanSubmission' && MEW_IDS.includes(row.id)) : rows.length === 0, 'A public original is still shared/referenced');
    }
  }
  try {
    await client.connect();
    const admin = (await client.query('SELECT id,role FROM public."User" WHERE "twitchUserId"=$1', [payload.ownerTwitchId])).rows[0];
    assertPrimaryMewAdmin(admin);
    check((await client.query('SELECT status FROM public."SitePublication" WHERE id=\'anniversary\'')).rows[0]?.status === 'PRIVATE', 'Publication must remain PRIVATE');
    const members = (env.UPMANDEX_PRIVATE_TWITCH_IDS ?? '').split(',').map(value => value.trim());
    check(members.includes(payload.ownerTwitchId), 'Owner not allowed in PRIVATE', 403);
    const existing = await get(markerUrl, { ...privateOptions, access: 'private', useCache: false });
    if (existing?.statusCode === 200) marker = JSON.parse(await new Response(existing.stream).text());
    if (payload.mode === 'check') {
      const sample = await list({ ...privateOptions, limit: 1 });
      const sampleVerified = await verifyListedPrivateBlob(sample.blobs, store, get);
      let revocationVerified = null;
      if (['complete', 'cache-pending'].includes(marker?.state) && marker.deleted?.length === 2 && MEW_IDS.every(id => marker.deleted.includes(id))) {
        revocationVerified = true;
        for (const source of payload.sources) {
          const response = await fetch(source.publicUrl, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(8000) });
          revocationVerified = revocationVerified && [404, 410].includes(response.status);
          await response.body?.cancel();
        }
      }
      return { outcome: 'runtime-ready', runtimeTokenPresent: true, explicitPrivateStoreSelected: true,
        privateStoreAccessVerified: true, state: 'PRIVATE', operationState: marker?.state ?? 'unclaimed',
        privateStoreTypeConfirmedByExistingObjects: sampleVerified,
        oldUrlsInaccessible: revocationVerified,
        imagesCopied: marker?.copies?.length ?? 0, originalsDeleted: marker?.deleted?.length ?? 0,
        ...(marker ? { progress: mewProgress(marker) } : {}) };
    }
    check((await client.query('SELECT pg_try_advisory_lock(731876,2001) AS locked')).rows[0].locked, 'Another MEW operation is active');
    const latest = await get(markerUrl, { ...privateOptions, access: 'private', useCache: false });
    marker = latest?.statusCode === 200 ? JSON.parse(await new Response(latest.stream).text()) : null;
    const deleting = payload.mode === 'delete';
    if (deleting) {
      check(env.UPMANDEX_MEW_DELETE_ENABLED === '1' && marker?.state === 'prepared' && marker.owner === payload.ownerTwitchId
        && marker.privateCopiesVerified === 2 && marker.accessVerified === true && marker.referencesPrivate === true
        && marker.copies?.length === 2 && payload.sources.every(source => marker.copies.some(copy =>
          copy.id === source.id && copy.publicUrl === source.publicUrl && new URL(copy.privateUrl).origin === store.origin))
        && marker.deleted?.length === 0 && !marker.attemptingDelete, 'Verified preparation required before removal');
      etag = latest.blob.etag;
      check(etag, 'Private preparation marker version unavailable');
    } else {
      check(payload.mode === 'execute' && !marker, 'Operation already claimed; no automatic repeated execution');
    }
    const rows = (await client.query('SELECT s.*,u."twitchUserId" AS "ownerTwitchId" FROM public."UpmanSubmission" s JOIN public."User" u ON u.id=s."userId" WHERE s.id=ANY($1::text[]) ORDER BY s.id', [MEW_IDS])).rows;
    check(rows.length === 2 && rows.every(row => row.name === 'MEW' && ['PENDING', 'REJECTED'].includes(row.status) && !row.approvedUpmanId
      && (deleting ? marker.copies.some(copy => copy.id === row.id && copy.privateUrl === row.image)
        : payload.sources.some(source => source.id === row.id && source.publicUrl === row.image))), 'MEW identities/status/references changed');
    check(rows.every(row => /^[1-9]\d{0,29}$/.test(row.ownerTwitchId ?? '') && members.includes(row.ownerTwitchId)), 'Submission owner is not linked and authorized in PRIVATE');
    await noReferences(!deleting);
    if (!deleting) {
      marker = { state: 'claimed', owner: payload.ownerTwitchId, startedAt: new Date().toISOString(), copies: [], deleted: [] };
      try {
        const claim = await claimMewOperation(put, markerPath, marker, privateOptions);
        check(new URL(claim.url).origin === store.origin, 'Private claim store mismatch');
        etag = claim.etag;
      } catch { throw new MewError('Private store claim failed or operation already claimed; no images changed'); }
    }
    claimed = true;
    const replace = async (copies, restore = false) => {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE');
      try {
        for (const copy of copies) {
          const row = rows.find(value => value.id === copy.id);
          const changed = await client.query('UPDATE public."UpmanSubmission" SET image=$1 WHERE id=$2 AND image=$3 AND status=$4 AND "approvedUpmanId" IS NULL RETURNING id',
            [restore ? row.image : copy.privateUrl, row.id, restore ? copy.privateUrl : row.image, row.status]);
          check(changed.rowCount === 1, 'Concurrent submission change; transaction cancelled');
        }
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    };
    const result = await performMewTransfer({
      copyAndVerify: async () => {
        marker.state = 'copying'; await save();
        for (const row of rows) {
          const original = await readBlob(row.image, 'public', publicOptions);
          check(original.data.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', 'Original is not PNG');
          const destination = await put('upman-submissions/private-mew/' + row.id + '/' + randomUUID() + '.png', original.data,
            { ...privateOptions, access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'image/png', cacheControlMaxAge: 60 });
          const copy = { id: row.id, publicUrl: row.image, privateUrl: destination.url, hash: original.hash, publicEtag: original.etag };
          marker.copies.push(copy); await save();
          check(new URL(destination.url).origin === store.origin, 'Wrong destination store');
          check((await readBlob(copy.privateUrl, 'private', privateOptions)).hash === copy.hash, 'Private copy hash mismatch');
          const anonymous = await fetch(copy.privateUrl, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(8000) });
          await anonymous.body?.cancel();
          check([401, 403, 404].includes(anonymous.status), 'Private Blob readable anonymously');
          marker.privateCopiesVerified = (marker.privateCopiesVerified ?? 0) + 1; await save();
        }
        return marker.copies;
      },
      replaceReferences: async copies => { await replace(copies); marker.referencesPrivate = true; marker.state = 'references-updated'; await save(); },
      verifyAccess: async copies => {
        for (const copy of copies) {
          for (const principal of [null, payload.ownerTwitchId, rows.find(row => row.id === copy.id).ownerTwitchId]) {
            const user = principal ? (await client.query('SELECT id,role FROM public."User" WHERE "twitchUserId"=$1', [principal])).rows[0] : null;
            const row = (await client.query('SELECT image,"userId",status FROM public."UpmanSubmission" WHERE id=$1', [copy.id])).rows[0];
            check(row?.image === copy.privateUrl && row.status !== 'APPROVED', 'Submission changed during access verification');
            const response = await submissionMediaResponse(copy.id, {
              load: async () => ({ image: row.image, access: { admin: user?.role === 'ADMIN', owner: user?.id === row.userId,
                privateSite: true, member: principal !== null && members.includes(principal), approvedPublic: false } }),
              readPrivate: async url => { const blob = await get(url, { ...privateOptions, access: 'private', useCache: false }); return blob?.statusCode === 200 ? { stream: blob.stream } : null; },
              readLegacyPublic: async () => { throw new MewError('No public fallback permitted'); },
            });
            check(principal ? response.status === 200 && sha(Buffer.from(await response.arrayBuffer())) === copy.hash : response.status === 404,
              'Existing media responder failed owner/admin/anonymous access checks');
          }
        }
        marker.accessVerified = true; await save();
      },
      lockAndValidateDeletion: async copies => {
        await client.query('BEGIN READ WRITE'); await client.query("SET LOCAL lock_timeout='5s'");
        await client.query('LOCK TABLE public."UpmanSubmission",public."Upman",public."PersonArtwork",public."ProfileCosmeticAsset",public."PullEvent" IN SHARE MODE');
        await noReferences(false);
        assertPrimaryMewAdmin((await client.query('SELECT id,role FROM public."User" WHERE "twitchUserId"=$1', [payload.ownerTwitchId])).rows[0]);
        check((await client.query('SELECT status FROM public."SitePublication" WHERE id=\'anniversary\'')).rows[0]?.status === 'PRIVATE', 'Publication changed before deletion');
        const current = (await client.query('SELECT id,image,status FROM public."UpmanSubmission" WHERE id=ANY($1::text[])', [MEW_IDS])).rows;
        check(current.length === 2 && copies.every(copy => current.some(row => row.id === copy.id && row.image === copy.privateUrl && ['PENDING', 'REJECTED'].includes(row.status))), 'Last-minute submission change');
        for (const copy of copies) {
          const original = await readBlob(copy.publicUrl, 'public', publicOptions);
          check(original.etag === copy.publicEtag && original.hash === copy.hash && (await readBlob(copy.privateUrl, 'private', privateOptions)).hash === copy.hash,
            'Original/private copy changed before deletion');
        }
        marker.state = 'validated-for-deletion'; await save();
      },
      deleteOriginals: async copies => {
        marker.state = 'deleting'; await save();
        for (const copy of copies) {
          marker.attemptingDelete = copy.id; await save();
          await del(copy.publicUrl, { ...publicOptions, ifMatch: copy.publicEtag });
          marker.deleted.push(copy.id); marker.attemptingDelete = null; await save();
        }
        await client.query('COMMIT');
      },
      verifyRevocation: async copies => {
        marker.state = 'revocation-check'; await save();
        const checks = [];
        for (const copy of copies) {
          const response = await fetch(copy.publicUrl, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(8000) });
          await response.body?.cancel(); checks.push([404, 410].includes(response.status));
        }
        return { outcome: checks.every(Boolean) ? 'mew-secured' : 'cache-verification-pending', oldUrlsInaccessible: checks.every(Boolean) };
      },
      restoreReferences: async copies => { await client.query('ROLLBACK').catch(() => {}); await replace(copies, true); marker.referencesRestored = true; marker.referencesPrivate = false; await save(); },
      releaseLocks: async () => { await client.query('ROLLBACK').catch(() => {}); },
    }, { prepareOnly: !deleting, preparedCopies: deleting ? marker.copies : null });
    marker.state = !deleting ? 'prepared' : result.outcome === 'mew-secured' ? 'complete' : 'cache-pending'; marker.result = result; await save();
    return { ...result, privateStoreVerified: true, privateCopiesVerified: 2, referencesUpdated: 2, originalsDeleted: marker.deleted.length,
      accessVerification: 'existing media responder; database-backed owner/admin; anonymous denied', other22ReferencesUnchanged: true,
      domainChanged: false, publicReleaseTriggered: false };
  } catch (error) {
    if (claimed) {
      marker.failedDuring = marker.state; marker.state = 'failed'; marker.failedAt = new Date().toISOString();
      await save().catch(() => {});
      const failure = error instanceof MewError ? error : new MewError('Transfer interrupted; originals may be partially deleted only if deletion had started. No automatic retry.', 503);
      failure.progress = mewProgress(marker);
      throw failure;
    }
    throw error;
  } finally { await client.end().catch(() => {}); }
}
