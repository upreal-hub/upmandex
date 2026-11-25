// Explicitly authorized scope: two MEW copies, two image references, two original public deletions.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';
import { encode } from '@auth/core/jwt';
import { put, get, del } from '@vercel/blob';
import pg from 'pg';
import { atStage, identify, loadConfig, VerificationError } from './lot-4g-b-verify.mjs';
import { cloneConnectionConfig } from './lot-4f-c-simulation.mjs';
import { verifyDeploymentIdentity } from './vercel-deployment-identity.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const ids = ['cmvjhhfll000008i1m8vp5zz8', 'cmvjhi0t9000308i14kb6793j'];
const deployment = 'https://upmandex-5225zlkgw-upreal-s-projects.vercel.app';
const deploymentId = 'dpl_F5KAMPK7SZHV4fn8Hg91s3smyGaV';
const team = 'team_zVE7BEJPJwJLA8h1cnnPL2Kz';
const project = 'prj_R6Hdw8elr07EAAOT50AGsRXnBC5O';
const reportPath = 'upmandex-migration-exports/mew-private-execution.json';
const check = (value, message) => { if (!value) throw new VerificationError(message); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export function validateMewRows(rows, plan) {
  check(rows.length === 2 && plan.targets.length === 2, 'Périmètre MEW différent des deux soumissions autorisées.');
  for (const id of ids) {
    const row = rows.find(value => value.id === id);
    const expected = plan.targets.find(value => value.submissionId === id);
    check(row && expected && row.name === 'MEW' && ['PENDING', 'REJECTED'].includes(row.status) && !row.approvedUpmanId
      && row.image === expected.originalPublicUrl, 'Une référence ou un statut MEW a changé. Aucun original supprimé.');
    const url = new URL(row.image);
    check(url.protocol === 'https:' && url.hostname === 'e4pburhj5wrv8agh.public.blob.vercel-storage.com'
      && url.pathname.startsWith('/upman-submissions/') && !url.search && !url.hash, 'URL originale MEW inattendue.');
  }
}

export async function executeMewSteps(actions) {
  const copies = await actions.copyAndVerify();
  await actions.replaceReferences(copies);
  let deleting = false;
  try {
    await actions.verifyAccess(copies);
    await actions.lockAndValidateDeletion(copies);
    deleting = true;
    await actions.deleteOriginals(copies);
    return await actions.verifyRevocation(copies);
  } catch (error) {
    if (!deleting) await actions.restoreReferences(copies);
    throw error;
  } finally { await actions.releaseLocks(); }
}

function cli(args) {
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    '$a=ConvertFrom-Json $env:UPMANDEX_MEW_CLI_ARGS; & vercel.cmd @a; exit $LASTEXITCODE'], {
    cwd: root, env: { ...process.env, UPMANDEX_MEW_CLI_ARGS: JSON.stringify(args) }, encoding: 'utf8', timeout: 90_000 });
  check(result.status === 0, 'Accès CLI Vercel impossible ; aucun secret affiché.');
  return result.stdout.trim();
}

async function main(audit) {
  check(process.argv.length === 3 && process.argv[2] === '--execute-approved-mew', 'Confirmation --execute-approved-mew requise.');
  check(execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() === 'anniversary', 'Branche Git incorrecte.');
  check(execFileSync('git', ['check-ignore', '--', reportPath], { cwd: root, encoding: 'utf8' }).trim() === reportPath, 'Rapport privé non ignoré.');
  const env = { ...process.env };
  for (const name of ['.env.local', 'upmandex-migration-exports/anniversary-migration.env']) {
    if (existsSync(root + name)) for (const [key, value] of Object.entries(parseEnv(readFileSync(root + name, 'utf8').replace(/^\uFEFF/, '')))) env[key] ??= value;
  }
  if (!process.env.VERCEL_OIDC_TOKEN && env.VERCEL_OIDC_TOKEN) process.env.VERCEL_OIDC_TOKEN = env.VERCEL_OIDC_TOKEN;
  for (const key of ['PRIVATE_BLOB_READ_WRITE_TOKEN', 'AUTH_SECRET', 'DATABASE_URL', 'UPMANDEX_RELEASE_ADMIN_TWITCH_ID', 'UPMANDEX_PRIVATE_TWITCH_IDS']) {
    check(env[key], 'Configuration sécurisée absente : ' + key + '. Aucun original supprimé.');
  }
  check(env.UPMANDEX_ENV === 'anniversary' && env.UPMANDEX_PRIVATE_ACCESS === '1', 'Environnement Production Anniversary PRIVATE non confirmé.');
  check(env.BLOB_READ_WRITE_TOKEN || (env.BLOB_STORE_ID && env.VERCEL_OIDC_TOKEN), 'Accès authentifié au stockage public absent. Aucun original supprimé.');
  const plan = JSON.parse(readFileSync(root + 'upmandex-migration-exports/private-media-minimal-plan-1795036752976.json', 'utf8'));
  const config = loadConfig(readFileSync(root + 'upmandex-migration-exports/anniversary-migration.env', 'utf8'), env.NEON_API_KEY);
  audit.stage = 'identity';
  const target = await identify('anniversary', config.ANNIVERSARY_BRANCH_ID, env.DATABASE_URL, config.NEON_API_KEY);
  const metadata = JSON.parse(cli(['api', '/v13/deployments/' + deploymentId + '?teamId=' + team, '--method', 'GET', '--raw', '--scope', team]));
  verifyDeploymentIdentity(metadata, undefined, { deploymentId, projectId: project, projectName: 'upmandex', teamId: team, url: deployment });
  const client = new pg.Client(cloneConnectionConfig(target.url));
  const sourceOptions = env.BLOB_READ_WRITE_TOKEN ? { token: env.BLOB_READ_WRITE_TOKEN } : { storeId: env.BLOB_STORE_ID };
  const privateOptions = { token: env.PRIVATE_BLOB_READ_WRITE_TOKEN };
  const save = () => writeFileSync(root + reportPath, JSON.stringify(audit, null, 2) + '\n', { mode: 0o600 });
  const noSharing = async (urls, allowTargets = true) => {
    for (const table of ['Upman', 'UpmanSubmission', 'PersonArtwork', 'ProfileCosmeticAsset']) {
      const { rows } = await client.query('SELECT id FROM public."' + table + '" WHERE image=ANY($1::text[])', [urls]);
      check(allowTargets ? rows.every(row => table === 'UpmanSubmission' && ids.includes(row.id)) : rows.length === 0,
        'Un original MEW est encore référencé : suppression refusée.');
    }
  };
  async function bytes(url, access, options) {
    const blob = await get(url, { ...options, access, useCache: false });
    check(blob?.statusCode === 200 && blob.blob.size > 0 && blob.blob.size <= 4 * 1024 * 1024,
      'Objet Blob absent ou taille inattendue.');
    const data = Buffer.from(await new Response(blob.stream).arrayBuffer());
    check(data.length === blob.blob.size, 'Lecture Blob incomplète.');
    return { data, hash: sha(data), etag: blob.blob.etag };
  }
  async function requestMedia(id, twitchId) {
    const prefix = root + 'upmandex-migration-exports/mew-request-' + randomUUID();
    const salt = '__Secure-authjs.session-token';
    const cookie = twitchId ? salt + '=' + await encode({ secret: env.AUTH_SECRET, salt, maxAge: 90,
      token: { twitchUserId: twitchId, isAdmin: false } }) : null;
    // Short-lived authenticated test sessions, using existing SQL identities; no OAuth, account creation or role change.
    const lines = ['silent', 'show-error', 'max-time = 25', 'output = ' + JSON.stringify((prefix + '.body').replaceAll('\\', '/')), 'write-out = "%{http_code}"'];
    if (cookie) lines.push('header = ' + JSON.stringify('Cookie: ' + cookie));
    writeFileSync(prefix + '.curl', lines.join('\n'), { flag: 'wx', mode: 0o600 });
    try {
      const output = cli(['curl', '/api/submission-media/' + id, '--deployment', deployment, '--scope', team, '--', '--config', prefix + '.curl']);
      const status = Number(output.match(/(?:^|\n)(\d{3})\s*$/)?.[1]);
      return { status, hash: sha(readFileSync(prefix + '.body')) };
    } finally { for (const suffix of ['.curl', '.body']) try { unlinkSync(prefix + suffix); } catch { /* No temporary file. */ } }
  }
  try {
    await client.connect();
    check((await client.query('SELECT status FROM public."SitePublication" WHERE id=\'anniversary\'')).rows[0]?.status === 'PRIVATE', 'Publication non PRIVATE.');
    const rows = (await client.query('SELECT s.*, u."twitchUserId" AS "ownerTwitchId" FROM public."UpmanSubmission" s JOIN public."User" u ON u.id=s."userId" WHERE s.id=ANY($1::text[]) ORDER BY s.id', [ids])).rows;
    if (existsSync(root + reportPath)) {
      const previous = JSON.parse(readFileSync(root + reportPath, 'utf8'));
      check(previous.deletedOriginals?.length === 2 && ids.every(id => previous.deletedOriginals.includes(id))
        && previous.accessVerified && previous.copies?.length === 2, 'Exécution précédente incomplète : aucun nouvel essai d’écriture automatique. Examiner le rapport privé.');
      const checks = [];
      for (const copy of previous.copies) {
        check(ids.includes(copy.id) && plan.targets.some(target => target.submissionId === copy.id && target.originalPublicUrl === copy.originalUrl)
          && rows.some(row => row.id === copy.id && row.image === copy.privateUrl), 'État de reprise incompatible.');
        check((await bytes(copy.privateUrl, 'private', privateOptions)).hash === copy.hash, 'Copie privée de reprise non conforme.');
        const response = await fetch(copy.originalUrl, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(10_000) });
        checks.push({ id: copy.id, status: response.status, inaccessible: [404, 410].includes(response.status) });
        await response.body?.cancel();
      }
      console.log(JSON.stringify({ outcome: checks.every(row => row.inaccessible) ? 'mew-secured' : 'cache-verification-pending',
        resumeMode: 'read-only', oldUrls: checks, domainChanged: false, publicReleaseTriggered: false }, null, 2));
      return;
    }
    validateMewRows(rows, plan);
    const admin = (await client.query('SELECT "twitchUserId" FROM public."User" WHERE "twitchUserId"=$1 AND role=\'ADMIN\'', [env.UPMANDEX_RELEASE_ADMIN_TWITCH_ID])).rows[0];
    const members = env.UPMANDEX_PRIVATE_TWITCH_IDS.split(',').map(value => value.trim());
    check(admin && members.includes(admin.twitchUserId) && rows.every(row => /^[1-9]\d{0,29}$/.test(row.ownerTwitchId ?? '') && members.includes(row.ownerTwitchId)),
      'Administrateur ou propriétaire non lié/autorisé : contrôle authentifié impossible. Aucun original supprimé.');
    const urls = rows.map(row => row.image);
    await noSharing(urls);
    check(!existsSync(root + reportPath), 'Un rapport d’exécution existe déjà : arrêt pour éviter une double opération. Examiner ce rapport avant toute reprise.');
    audit.stage = 'private-copies'; audit.copies = []; audit.deletedOriginals = [];
    save();
    let referencesChanged = false;
    const replace = async (copies, restore = false) => {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE');
      try {
        for (const copy of copies) {
          const row = rows.find(value => value.id === copy.id);
          const changed = await client.query('UPDATE public."UpmanSubmission" SET image=$1 WHERE id=$2 AND image=$3 AND status=$4 AND "approvedUpmanId" IS NULL RETURNING id',
            [restore ? row.image : copy.privateUrl, row.id, restore ? copy.privateUrl : row.image, row.status]);
          check(changed.rowCount === 1, 'Conflit de soumission : transaction annulée.');
        }
        await client.query('COMMIT'); referencesChanged = !restore;
      } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    };
    const result = await executeMewSteps({
      copyAndVerify: async () => {
        for (const row of rows) {
          const original = await bytes(row.image, 'public', sourceOptions);
          check(original.data.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', 'Original MEW non PNG : arrêt.');
          const pathname = 'upman-submissions/private-mew/' + row.id + '/' + randomUUID() + '.png';
          const copy = await put(pathname, original.data, { ...privateOptions, access: 'private', addRandomSuffix: false,
            allowOverwrite: false, contentType: 'image/png', cacheControlMaxAge: 60 });
          const entry = { id: row.id, originalUrl: row.image, privateUrl: copy.url, hash: original.hash, originalEtag: original.etag };
          audit.copies.push(entry); save();
          check(new URL(copy.url).hostname.endsWith('.private.blob.vercel-storage.com'), 'Destination non privée.');
          check((await bytes(copy.url, 'private', privateOptions)).hash === original.hash, 'Copie privée différente de l’original.');
          const anonymous = await fetch(copy.url, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(10_000) });
          check([401, 403, 404].includes(anonymous.status), 'Copie privée lisible sans authentification.');
          await anonymous.body?.cancel();
        }
        return audit.copies;
      },
      replaceReferences: async copies => { audit.stage = 'two-image-references'; save(); await replace(copies); audit.referencesUpdated = true; save(); },
      verifyAccess: async copies => {
        audit.stage = 'authenticated-access'; save();
        for (const copy of copies) {
          const anonymous = await requestMedia(copy.id);
          check([401, 403, 404].includes(anonymous.status), 'Route média accessible anonymement.');
          const owner = await requestMedia(copy.id, rows.find(row => row.id === copy.id).ownerTwitchId);
          const administrator = await requestMedia(copy.id, admin.twitchUserId);
          check(owner.status === 200 && administrator.status === 200 && owner.hash === copy.hash && administrator.hash === copy.hash,
            'Accès propriétaire/admin non confirmé sur le déploiement. Vérifier son AUTH_SECRET et PRIVATE_BLOB_READ_WRITE_TOKEN ; aucun original supprimé.');
        }
        audit.accessVerified = true; save();
      },
      lockAndValidateDeletion: async copies => {
        await client.query('BEGIN READ WRITE');
        await client.query("SET LOCAL lock_timeout='5s'");
        await client.query('LOCK TABLE public."UpmanSubmission", public."Upman", public."PersonArtwork", public."ProfileCosmeticAsset" IN SHARE MODE');
        await noSharing(urls, false);
        const current = (await client.query('SELECT id,image,status,"approvedUpmanId" FROM public."UpmanSubmission" WHERE id=ANY($1::text[])', [ids])).rows;
        check(current.length === 2 && copies.every(copy => current.some(row => row.id === copy.id && row.image === copy.privateUrl
          && ['PENDING', 'REJECTED'].includes(row.status) && !row.approvedUpmanId)), 'État des soumissions modifié entre-temps.');
        for (const copy of copies) {
          const original = await bytes(copy.originalUrl, 'public', sourceOptions);
          check(original.etag === copy.originalEtag && original.hash === copy.hash, 'Original public modifié : suppression refusée.');
          check((await bytes(copy.privateUrl, 'private', privateOptions)).hash === copy.hash, 'Copie privée non conforme avant suppression.');
        }
      },
      deleteOriginals: async copies => {
        audit.stage = 'authorized-public-original-deletion'; save();
        for (const copy of copies) {
          await del(copy.originalUrl, { ...sourceOptions, ifMatch: copy.originalEtag });
          audit.deletedOriginals.push(copy.id); save();
        }
        await client.query('COMMIT');
      },
      verifyRevocation: async copies => {
        audit.stage = 'public-url-cache-verification'; save();
        const checks = [];
        for (const copy of copies) {
          const response = await fetch(copy.originalUrl, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(10_000) });
          checks.push({ id: copy.id, status: response.status, inaccessible: [404, 410].includes(response.status) });
          await response.body?.cancel();
        }
        return { outcome: checks.every(row => row.inaccessible) ? 'mew-secured' : 'cache-verification-pending', oldUrls: checks };
      },
      restoreReferences: async copies => {
        await client.query('ROLLBACK').catch(() => {});
        if (referencesChanged) { await replace(copies, true); audit.referencesRestored = true; save(); }
      },
      releaseLocks: async () => { await client.query('ROLLBACK').catch(() => {}); },
    });
    Object.assign(audit, result, { stage: 'complete', other22ReferencesUnchanged: true, domainChanged: false, publicReleaseTriggered: false,
      authenticatedTestMode: 'Short-lived server-signed sessions for existing owner/admin; two media GET routes only; no OAuth or account modification' });
    save();
    console.log(JSON.stringify({ outcome: audit.outcome, privateCopiesVerified: 2, referencesUpdated: 2, oldUrls: audit.oldUrls,
      other22ReferencesUnchanged: true, privateReport: reportPath, domainChanged: false, publicReleaseTriggered: false }, null, 2));
  } finally { await client.end().catch(() => {}); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const audit = { outcome: 'blocked', stage: 'configuration', startedAt: new Date().toISOString() };
  atStage('Traitement ciblé des deux MEW', async () => {
    try { await main(audit); } catch (error) {
      if (/^Blob[A-Za-z]*Error$/.test(error?.name ?? '')) throw new VerificationError('Stockage Blob : ' + error.name + '. Vérifier les autorisations et la configuration du stockage concerné.');
      throw error;
    }
  }).catch(error => {
    audit.diagnostic = error.message;
    if (audit.copies) writeFileSync(root + reportPath, JSON.stringify(audit, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify({ outcome: 'blocked', stage: audit.stage, diagnostic: error.message,
      copiedCount: audit.copies?.length ?? 0, deletedCount: audit.deletedOriginals?.length ?? 0,
      referencesRestored: audit.referencesRestored ?? false, privateReport: audit.copies ? reportPath : null,
      automaticRetry: false, domainChanged: false }, null, 2));
    process.exitCode = 1;
  });
}
