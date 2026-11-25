// Deploy the one-off owner-session operation only. Never exports runtime secrets or runs a transfer.
import { spawnSync, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { identify, loadConfig, atStage, VerificationError } from './lot-4g-b-verify.mjs';
import { verifyDeploymentIdentity } from './vercel-deployment-identity.mjs';
import { OPERATION, signMewRequest } from '../lib/mew-runtime-auth.mjs';
import { readVercelJson, summarizeAuthLogs } from './mew-signing-context.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const project = 'prj_R6Hdw8elr07EAAOT50AGsRXnBC5O';
const team = 'team_zVE7BEJPJwJLA8h1cnnPL2Kz';
const check = (value, reason) => { if (!value) throw new VerificationError(reason); };
const cli = (args, timeout = 90_000, readStage) => {
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    '$a=ConvertFrom-Json $env:UPMANDEX_RUNTIME_ARGS; & vercel.cmd @a; exit $LASTEXITCODE'], {
    cwd: root, env: { ...process.env, UPMANDEX_RUNTIME_ARGS: JSON.stringify(args) }, encoding: 'utf8', timeout });
  if (readStage || result.status !== 0) {
    const stage = readStage ?? 'vercel-command';
    try { return readVercelJson(result, stage); } catch (cause) {
      const error = new VerificationError('Lecture Vercel bloquée : ' + cause.diagnostic.category + ' (' + stage + '). Aucun transfert lancé.');
      error.safeDiagnostic = cause.diagnostic;
      throw error;
    }
  }
  check(result.status === 0, 'Commande Vercel interrompue. Aucun nouvel essai automatique ; vérifier le dernier déploiement/rapport avant reprise.');
  return result.stdout.trim();
};
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--diagnose-access') {
    check(execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() === 'anniversary', 'Branche anniversary requise.');
    const receiptFile = existsSync(root + 'upmandex-migration-exports/auth-diagnostic-deployment.json')
      ? 'upmandex-migration-exports/auth-diagnostic-deployment.json' : 'upmandex-migration-exports/mew-session-deployment.json';
    const receipt = JSON.parse(readFileSync(root + receiptFile, 'utf8'));
    check(receipt.project === project, 'Projet du reçu incorrect.');
    const url = new URL(receipt.deployment);
    check(url.protocol === 'https:' && /^upmandex-[a-z0-9]+-upreal-s-projects\.vercel\.app$/.test(url.hostname)
      && url.pathname === '/' && !url.username && !url.password && !url.search && !url.hash, 'URL du reçu incorrecte.');
    const response = cli(['api', '/v13/deployments/' + url.hostname + '?teamId=' + team,
      '--method', 'GET', '--raw', '--scope', team], 90_000, 'deployment-identity');
    const metadata = response.deployment ?? response;
    verifyDeploymentIdentity(metadata, undefined, { projectId: project, projectName: 'upmandex', teamId: team, deploymentId: metadata.id, url: url.origin });
    const logs = cli(['logs', url.origin, '--project', project, '--scope', team, '--since', '24h', '--limit', '100', '--json', '--no-follow']);
    console.log(JSON.stringify({ outcome: 'read-only-auth-diagnostic', deployment: url.origin, ...summarizeAuthLogs(logs),
      neonAccessed: false, blobsAccessed: false, domainChanged: false, publicReleaseTriggered: false }, null, 2));
    return;
  }
  if (args.length === 1 && args[0] === '--deploy-auth-diagnostic-only') {
    check(execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() === 'anniversary', 'Branche anniversary requise.');
    const receipt = 'upmandex-migration-exports/auth-diagnostic-deployment.json';
    check(execFileSync('git', ['check-ignore', '--', receipt], { cwd: root, encoding: 'utf8' }).trim() === receipt, 'Reçu privé non ignoré.');
    check(!existsSync(root + receipt), 'Déploiement de diagnostic déjà enregistré : aucun second déploiement automatique.');
    const previous = JSON.parse(readFileSync(root + 'upmandex-migration-exports/mew-session-deployment.json', 'utf8'));
    check(previous.project === project && /^https:\/\/upmandex-[a-z0-9]+-upreal-s-projects\.vercel\.app$/.test(previous.deployment), 'Projet ou URL de référence incorrects.');
    const previousResponse = cli(['api', '/v13/deployments/' + new URL(previous.deployment).hostname + '?teamId=' + team,
      '--method', 'GET', '--raw', '--scope', team], 90_000, 'deployment-identity');
    const previousMetadata = previousResponse.deployment ?? previousResponse;
    verifyDeploymentIdentity(previousMetadata, undefined, { projectId: project, projectName: 'upmandex', teamId: team,
      deploymentId: previousMetadata.id, url: previous.deployment });
    const stage = execFileSync(process.execPath, ['tools/lot-5b-package-preview.mjs'], { cwd: root, encoding: 'utf8' }).trim();
    const output = cli(['deploy', stage, '--project', project, '--scope', team, '--prod', '--skip-domain',
      '--env', 'UPMANDEX_AUTH_DIAGNOSTIC=1', '--env', 'UPMANDEX_MEW_RUNTIME_ENABLED=0', '--yes'], 15 * 60_000);
    const urls = [...output.matchAll(/https:\/\/[a-zA-Z0-9-]+\.vercel\.app/g)];
    check(urls.length, 'URL non confirmée : consulter Vercel sans redéployer automatiquement.');
    const deployment = urls.at(-1)[0];
    writeFileSync(root + receipt, JSON.stringify({ project, deployment, previousDeployment: previous.deployment,
      domainChanged: false, mewOperationEnabled: false, createdAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    const response = cli(['api', '/v13/deployments/' + new URL(deployment).hostname + '?teamId=' + team,
      '--method', 'GET', '--raw', '--scope', team], 90_000, 'deployment-identity');
    const metadata = response.deployment ?? response;
    verifyDeploymentIdentity(metadata, undefined, { projectId: project, projectName: 'upmandex', teamId: team, deploymentId: metadata.id, url: deployment });
    console.log(JSON.stringify({ outcome: 'auth-diagnostic-deployed', deployment, twitchCallbackToRegister: deployment + '/api/auth/callback/twitch',
      login: deployment + '/waiting', mewOperationEnabled: false, domainChanged: false, publicReleaseTriggered: false }, null, 2));
    return;
  }
  if (args.length === 1 && ['--deploy-session-only', '--deploy-prepare-only', '--deploy-prepare-origin-fix', '--deploy-prepare-final'].includes(args[0])) {
    check(execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() === 'anniversary', 'Branche anniversary requise.');
    const receipt = {
      '--deploy-session-only': 'upmandex-migration-exports/mew-session-deployment.json',
      '--deploy-prepare-only': 'upmandex-migration-exports/mew-preparation-deployment.json',
      '--deploy-prepare-origin-fix': 'upmandex-migration-exports/mew-preparation-origin-fix-deployment.json',
      '--deploy-prepare-final': 'upmandex-migration-exports/mew-preparation-final-deployment.json',
    }[args[0]];
    check(execFileSync('git', ['check-ignore', '--', receipt], { cwd: root, encoding: 'utf8' }).trim() === receipt, 'Reçu privé non ignoré.');
    check(!existsSync(root + receipt), 'Déploiement ponctuel déjà enregistré : utiliser son URL, sans nouveau déploiement automatique.');
    const config = loadConfig(readFileSync(root + 'upmandex-migration-exports/anniversary-migration.env', 'utf8'), process.env.NEON_API_KEY);
    const target = await identify('anniversary', config.ANNIVERSARY_BRANCH_ID, config.ANNIVERSARY_DATABASE_URL, config.NEON_API_KEY);
    const plan = JSON.parse(readFileSync(root + 'upmandex-migration-exports/private-media-minimal-plan-1795036752976.json', 'utf8'));
    check(plan.executionAuthorized === true, 'Autorisation MEW absente du plan privé.');
    const pinned = { project: 'late-paper-17187204', branchName: 'anniversary', branchId: target.branch.id,
      databaseHost: target.url.hostname.replace(/^([^.]+?)-pooler\./, '$1.'), databaseName: 'neondb', attestedAt: Date.now(),
      sources: plan.targets.map(row => ({ id: row.submissionId, publicUrl: row.originalPublicUrl })) };
    // Scope validation uses only a local throwaway fixture secret, never a Vercel secret.
    const { authenticateMewRequest } = await import('../lib/mew-runtime-auth.mjs');
    const validation = JSON.stringify({ ...pinned, operation: OPERATION, mode: 'check', ownerTwitchId: '1',
      nonce: randomUUID(), issuedAt: Date.now() });
    authenticateMewRequest(validation, signMewRequest(validation, 'local-scope-validation'),
      { AUTH_SECRET: 'local-scope-validation', UPMANDEX_MEW_RUNTIME_ENABLED: '1', UPMANDEX_RELEASE_ADMIN_TWITCH_ID: '1' });
    const stage = execFileSync(process.execPath, ['tools/lot-5b-package-preview.mjs'], { cwd: root, encoding: 'utf8' }).trim();
    writeFileSync(join(stage, 'lib/mew-runtime-target.mjs'), "import 'server-only';\nexport const mewTarget = " + JSON.stringify(pinned) + ';\n');
    const output = cli(['deploy', stage, '--project', project, '--scope', team, '--prod', '--skip-domain',
      '--env', 'UPMANDEX_MEW_RUNTIME_ENABLED=1', '--env', 'UPMANDEX_MEW_DELETE_ENABLED=0',
      '--env', 'UPMANDEX_RELEASE_READY=0', '--yes'], 15 * 60_000);
    const urls = [...output.matchAll(/https:\/\/[a-zA-Z0-9-]+\.vercel\.app/g)];
    check(urls.length, 'Déploiement à consulter dans Vercel : URL non confirmée. Ne pas redéployer automatiquement.');
    const deployment = urls.at(-1)[0];
    // Persist before the final read so a network failure cannot cause a repeat deployment.
    writeFileSync(root + receipt, JSON.stringify({ project, deployment, domainChanged: false, transferExecuted: false }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    const metadataResponse = cli(['api', '/v13/deployments/' + new URL(deployment).hostname + '?teamId=' + team,
      '--method', 'GET', '--raw', '--scope', team], 90_000, 'deployment-identity');
    const metadata = metadataResponse.deployment ?? metadataResponse;
    verifyDeploymentIdentity(metadata, undefined, { projectId: project, projectName: 'upmandex', teamId: team, deploymentId: metadata.id, url: deployment });
    console.log(JSON.stringify({ outcome: 'session-operation-deployed', deployment, state: 'PRIVATE',
      twitchCallbackToRegister: deployment + '/api/auth/callback/twitch', login: deployment + '/waiting',
      operation: deployment + '/api/operations/mew-private-transfer', transferExecuted: false,
      domainChanged: false, publicReleaseTriggered: false }, null, 2));
    return;
  }
  throw new VerificationError('Utiliser uniquement --deploy-session-only après confirmation du redéploiement. Le transfert nécessite la session Twitch du propriétaire.');
}

atStage('Opération MEW côté Vercel', main).catch(error => {
  console.log(JSON.stringify({ outcome: 'blocked', diagnostic: error.message, ...(error.safeDiagnostic ? { details: error.safeDiagnostic } : {}),
    automaticRetry: false, domainChanged: false, publicReleaseTriggered: false }, null, 2));
  process.exitCode = 1;
});
