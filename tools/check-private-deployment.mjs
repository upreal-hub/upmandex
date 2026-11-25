// Read-only verification of the existing deployment and current media references. Never aliases or deploys.
import { spawnSync, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { atStage, identify, loadConfig, VerificationError } from './lot-4g-b-verify.mjs';
import { cloneConnectionConfig } from './lot-4f-c-simulation.mjs';
import { verifyDeploymentIdentity } from './vercel-deployment-identity.mjs';
import { assessWaitingRedirect } from './private-waiting-redirect.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const deployment = 'https://upmandex-5225zlkgw-upreal-s-projects.vercel.app';
const deploymentId = 'dpl_F5KAMPK7SZHV4fn8Hg91s3smyGaV';
const project = 'prj_R6Hdw8elr07EAAOT50AGsRXnBC5O';
const team = 'team_zVE7BEJPJwJLA8h1cnnPL2Kz';
const prefix = 'upmandex-migration-exports/private-deployment-' + Date.now();
const check = (value, message) => { if (!value) throw new VerificationError(message); };
function cli(args) {
  const command = '$cliArgs = ConvertFrom-Json $env:UPMANDEX_CHECK_ARGS; & vercel.cmd @cliArgs; exit $LASTEXITCODE';
  const result = process.platform === 'win32'
    ? spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
      cwd: root, env: { ...process.env, UPMANDEX_CHECK_ARGS: JSON.stringify(args) }, encoding: 'utf8', timeout: 90_000 })
    : spawnSync('vercel', args, { cwd: root, encoding: 'utf8', timeout: 90_000 });
  check(result.status === 0, 'Requête Vercel refusée ou réseau indisponible. Vérifier la session CLI ; aucun paramètre distant modifié par cet outil.');
  return result.stdout.trim();
}
async function main() {
  const redirectsOnly = process.argv.length === 3 && process.argv[2] === '--redirects-only';
  check(process.argv.length === 2 || redirectsOnly, 'Sans argument : contrôle complet ; --redirects-only : deux redirections uniquement. Aucune bascule.');
  check(execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() === 'anniversary', 'Branche Git incorrecte.');
  check(execFileSync('git', ['check-ignore', '--', prefix + '.json'], { cwd: root, encoding: 'utf8' }).trim() === prefix + '.json', 'Rapport privé non ignoré par Git.');
  const metadata = JSON.parse(cli(['inspect', deployment, '--json', '--scope', team]));
  const view = metadata.deployment ?? metadata;
  // CLI 59 inspect JSON intentionally omits projectId. A name alone is not identity proof.
  const apiMetadata = view.projectId || view.project?.id ? undefined : JSON.parse(cli(['api',
    '/v13/deployments/' + deploymentId + '?teamId=' + team, '--method', 'GET', '--raw', '--scope', team]));
  verifyDeploymentIdentity(metadata, apiMetadata, { projectId: project, projectName: 'upmandex',
    deploymentId, teamId: team, url: deployment });
  const routes = [];
  const paths = redirectsOnly ? ['/my-collection', '/admin']
    : ['/waiting', '/my-collection', '/admin', '/api/viewer-inventory?viewer=upreal_', '/api/admin/release', '/api/auth/providers'];
  for (const path of paths) {
    const file = root + prefix + '.response';
    const headerFile = root + prefix + '.headers';
    try {
      // Authenticates only at Vercel's deployment barrier, never as a Twitch user.
      const output = cli(['curl', path, '--deployment', deployment, '--scope', team, '--',
        '--silent', '--show-error', '--max-time', '25', '--output', file, '--dump-header', headerFile, '--write-out', '%{http_code}']);
      const match = output.match(/(?:^|\n)(\d{3})\s*$/);
      check(match, 'Statut HTTP du déploiement non interprétable.');
      const status = Number(match[1]);
      const body = readFileSync(file, 'utf8');
      const location = readFileSync(headerFile, 'utf8').match(/^location:\s*(.*)$/im)?.[1]?.trim();
      let parsed;
      try { parsed = JSON.parse(body); } catch { parsed = null; }
      let valid;
      let redirect;
      if (path === '/waiting') valid = status === 200 && body.includes('Something new is coming.');
      else if (path.startsWith('/api/auth/')) {
        valid = status === 200 && parsed?.twitch?.callbackUrl === 'https://upmandex.com/api/auth/callback/twitch';
      } else if (path.startsWith('/api/')) valid = [401, 403].includes(status) && parsed?.error === 'Private access required';
      else { redirect = assessWaitingRedirect(location, deployment, path); valid = status === 307 && redirect.passed; }
      routes.push({ path, status, ...(redirect ?? {}), passed: Boolean(valid) });
    } finally {
      for (const temporary of [file, headerFile]) try { unlinkSync(temporary); } catch { /* No response file exists. */ }
    }
  }
  if (redirectsOnly) {
    console.log(JSON.stringify({ outcome: routes.every(row => row.passed) ? 'redirects-verified' : 'blocked', deployment, routes,
      domainChanged: false, databaseQueried: false, blobChanged: false }, null, 2));
    return;
  }
  // Only metadata and media references are read; no migration or business reconciliation is rerun.
  const config = loadConfig(readFileSync(root + 'upmandex-migration-exports/anniversary-migration.env', 'utf8'), process.env.NEON_API_KEY);
  const target = await identify('anniversary', config.ANNIVERSARY_BRANCH_ID, config.ANNIVERSARY_DATABASE_URL, config.NEON_API_KEY);
  const client = new pg.Client(cloneConnectionConfig(target.url));
  const media = [];
  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY');
    const statements = {
      Upman: 'SELECT id, name, image, "dexVisibility" FROM public."Upman"',
      UpmanSubmission: 'SELECT id, name, image, status FROM public."UpmanSubmission"',
      PersonArtwork: 'SELECT a.id, a.title AS name, a.image, p."isPublic" FROM public."PersonArtwork" a JOIN public."Person" p ON p.id=a."personId"',
      ProfileCosmeticAsset: 'SELECT id, name, image, "ownerUserId" FROM public."ProfileCosmeticAsset"',
    };
    for (const [table, sql] of Object.entries(statements)) for (const row of (await client.query(sql)).rows) {
      let url;
      try { url = new URL(row.image); } catch { continue; }
      if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(url.hostname)) continue;
      const confidential = table === 'Upman' && row.dexVisibility !== 'PUBLIC'
        || table === 'UpmanSubmission' && row.status !== 'APPROVED'
        || table === 'PersonArtwork' && !row.isPublic;
      media.push({ table, id: row.id, name: row.name, url: url.href,
        classification: confidential ? 'confidential' : row.ownerUserId ? 'personal-privacy-review' : 'reveal-approval-required' });
    }
  } finally { await client.end().catch(() => {}); }
  const previous = JSON.parse(readFileSync(root + 'upmandex-migration-exports/anniversary-launch-1795027915619.json', 'utf8'));
  for (const reference of previous.publicBlobReferences) if (!media.some(row => row.url === reference.url)) {
    media.push({ ...reference, classification: 'old-public-reference-review' });
  }
  for (const row of media) {
    try {
      const response = await fetch(row.url, { method: 'HEAD', redirect: 'manual', credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(8000) });
      row.httpStatus = response.status;
      row.publiclyAccessible = response.ok;
    } catch { row.httpStatus = null; row.publiclyAccessible = null; }
  }
  const exposed = media.filter(row => row.publiclyAccessible === true);
  const confidentialExposed = exposed.filter(row => row.classification === 'confidential');
  const report = { deployment, project, routes, media, callbackExpected: 'https://upmandex.com/api/auth/callback/twitch',
    twitchRegistrationVerified: false, domainChanged: false, blobChanged: false };
  writeFileSync(root + prefix + '.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ outcome: routes.every(row => row.passed) ? 'private-routes-verified' : 'blocked', deployment,
    routes, publicReferencesChecked: media.length, accessiblePublicReferences: exposed.length,
    confidentialPublicReferences: confidentialExposed.length, mediaDecisionsRequired: exposed.length - confidentialExposed.length,
    mediaChecksUnavailable: media.filter(row => row.publiclyAccessible === null).length,
    callbackRequestedByAuthJsIsCorrect: routes.find(row => row.path === '/api/auth/providers')?.passed === true,
    remainingAction: 'Confirm the registered callback in Twitch Developer Console and resolve exposed confidential/reveal-review media before domain cutover.',
    privateReport: prefix + '.json', domainChanged: false, publicReleaseTriggered: false }, null, 2));
}
atStage('Contrôle du déploiement PRIVATE', main).catch(error => {
  console.log(JSON.stringify({ outcome: 'blocked', diagnostic: error.message, domainChanged: false }, null, 2));
  process.exitCode = 1;
});
