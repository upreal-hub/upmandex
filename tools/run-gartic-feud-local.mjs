import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import pg from 'pg';
import { identify, loadConfig, neonGet } from './lot-4g-b-verify.mjs';
import { cloneConnectionConfig } from './lot-4f-c-simulation.mjs';
import { verifyClone } from './test-release-neon.mjs';

const branchName = 'anniversary-reconciliation-4g-d-2026-11-17';
const origin = 'http://localhost:3000';
const readEnv = path => parseEnv(readFileSync(path, 'utf8'));
const check = (condition, message) => { if (!condition) throw new Error(message); };
const safeValue = value => typeof value === 'string' && Boolean(value.trim()) && !/^(?:\*+|redacted|hidden|sensitive)$/i.test(value.trim());

async function connectClone() {
  const config = loadConfig(readFileSync('upmandex-migration-exports/anniversary-migration.env', 'utf8'), process.env.NEON_API_KEY);
  const token = config.NEON_API_KEY;
  const [target, backup, list] = await Promise.all([
    identify('anniversary', config.ANNIVERSARY_BRANCH_ID, config.ANNIVERSARY_DATABASE_URL, token),
    identify('backup-anniversary-before-migration-2026-11-17', config.ANNIVERSARY_BACKUP_BRANCH_ID, config.ANNIVERSARY_BACKUP_DATABASE_URL, token),
    neonGet('/branches?search=' + branchName, token, 'recherche clone Gartic Feud'),
  ]);
  check(backup.branch.parent_id === target.branch.id, 'Parent de la sauvegarde inattendu.');
  const matches = list.branches?.filter(branch => branch.name === branchName);
  check(matches?.length === 1 && !list.pagination?.cursor, 'Clone introuvable ou recherche ambiguë.');
  const branch = matches[0];
  const { endpoints } = await neonGet('/branches/' + branch.id + '/endpoints', token, 'compute clone Gartic Feud');
  const writable = endpoints?.filter(endpoint => endpoint.type === 'read_write');
  check(writable?.length === 1, 'Endpoint de test ambigu.');
  verifyClone(branch, writable[0], target, backup);
  const url = new URL(config.ANNIVERSARY_BACKUP_DATABASE_URL);
  url.hostname = writable[0].host;
  url.search = '?sslmode=verify-full';
  const verified = await identify(branchName, branch.id, url.href, token);
  check(verified.endpointId === writable[0].id, 'Endpoint de test inattendu.');
  return url;
}

async function prepare(url, owner, apply) {
  const client = new pg.Client(cloneConnectionConfig(url));
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const { rows: [state] } = await client.query(`
      SELECT (SELECT "status" FROM public."SitePublication" WHERE id = 'anniversary') = 'PRIVATE' AS private,
        EXISTS (SELECT 1 FROM public."User" WHERE "twitchUserId" = $1 AND role = 'ADMIN') AS admin,
        to_regclass('public."GarticFeud"') IS NOT NULL AS migrated
    `, [owner]);
    await client.query('ROLLBACK');
    check(state?.private === true, 'État PRIVATE du clone non confirmé.');
    check(state.admin === true, 'Le propriétaire configuré ne correspond pas à un ADMIN Twitch lié sur le clone.');
    console.log('Clone isolé confirmé · SitePublication PRIVATE · propriétaire ADMIN lié.');
    if (!state.migrated) {
      check(apply, 'Migration Gartic Feud absente. Exécuter d’abord --prepare.');
      const sql = readFileSync('prisma/migrations/20261123170000_gartic_feud/migration.sql', 'utf8');
      await client.query('BEGIN READ WRITE');
      await client.query('SET LOCAL search_path = public, pg_catalog');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('Migration SQL Gartic Feud appliquée seule.');
    }
    await client.query('BEGIN READ ONLY');
    await client.query('SELECT id, revision, state FROM public."GarticFeud" LIMIT 0');
    await client.query('ROLLBACK');
    console.log('Table GarticFeud vérifiée en lecture seule.');
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const mode = process.argv[2];
  check(process.argv.length === 3 && ['--prepare', '--serve'].includes(mode), 'Utiliser --prepare ou --serve.');
  const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
  check(branch === 'anniversary', 'Branche Git inattendue.');
  const local = readEnv('.env.local');
  const approved = readEnv('upmandex-migration-exports/anniversary-launch-1795027915619.env');
  const owner = approved.UPMANDEX_RELEASE_ADMIN_TWITCH_ID;
  check(/^[1-9]\d{0,29}$/.test(owner ?? ''), 'Identité propriétaire approuvée indisponible.');
  const localClientId = process.env.GARTIC_FEUD_TWITCH_CLIENT_ID;
  const localClientSecret = process.env.GARTIC_FEUD_TWITCH_CLIENT_SECRET;
  const hasOverride = localClientId !== undefined || localClientSecret !== undefined;
  check(!hasOverride || (safeValue(localClientId) && safeValue(localClientSecret)),
    'Renseigner ensemble les deux identifiants OAuth dédiés à Gartic Feud.');
  const twitchId = hasOverride ? localClientId.trim() : local.AUTH_TWITCH_ID;
  const twitchSecret = hasOverride ? localClientSecret.trim() : local.AUTH_TWITCH_SECRET;
  check([local.AUTH_SECRET, twitchId, twitchSecret].every(safeValue), 'Configuration OAuth locale incomplète.');
  const url = await connectClone();
  await prepare(url, owner, mode === '--prepare');
  if (mode === '--prepare') return;
  const env = {
    ...process.env,
    DATABASE_URL: url.href, AUTH_URL: origin, NEXTAUTH_URL: origin,
    AUTH_SECRET: local.AUTH_SECRET, AUTH_TWITCH_ID: twitchId, AUTH_TWITCH_SECRET: twitchSecret,
    UPMANDEX_ENV: 'anniversary', UPMANDEX_PRIVATE_ACCESS: '1',
    UPMANDEX_PRIVATE_TWITCH_IDS: owner, UPMANDEX_RELEASE_ADMIN_TWITCH_ID: owner,
    UPMANDEX_RELEASE_READY: '0', UPMANDEX_ADMIN_TEST_PREVIEW: '0',
    UPMANDEX_AUTH_DIAGNOSTIC: '0', UPMANDEX_MEW_RUNTIME_ENABLED: '0', UPMANDEX_MEW_DELETE_ENABLED: '0',
  };
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', 'localhost', '--port', '3000'], {
    env, stdio: 'inherit',
  });
  child.on('exit', code => { process.exitCode = code ?? 1; });
  child.on('error', () => { console.error('Démarrage local impossible.'); process.exitCode = 1; });
}

main().catch(error => {
  // Report stages and SQLSTATE only. Native networking and database errors can contain private hosts.
  const message = error instanceof Error ? error.message : '';
  const safe = /^(?:Utiliser|Branche Git inattendue\.|Identité propriétaire approuvée indisponible\.|Configuration OAuth locale incomplète\.|Renseigner ensemble les deux identifiants OAuth dédiés à Gartic Feud\.|Parent de la sauvegarde inattendu\.|Clone introuvable ou recherche ambiguë\.|Endpoint de test (?:ambigu|inattendu)\.|État PRIVATE du clone non confirmé\.|Le propriétaire configuré ne correspond pas à un ADMIN Twitch lié sur le clone\.|Migration Gartic Feud absente\.)/.test(message);
  console.error(safe ? message : 'Vérification du clone ou migration indisponible.' +
    (/^[0-9A-Z]{5}$/.test(error?.code ?? '') ? ' SQLSTATE ' + error.code : ''));
  process.exitCode = 1;
});
