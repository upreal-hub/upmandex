// Default: read-only launch preflight. Installation requires an explicit target + approved fingerprint.
// Never deploys, updates Vercel, triggers PUBLIC or changes any Blob.
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pg from 'pg';
import { atStage, readVerifiedPair, readSnapshot, VerificationError } from './lot-4g-b-verify.mjs';
import { checkIntegrity, cloneConnectionConfig } from './lot-4f-c-simulation.mjs';
import { verifyMigrationHistory } from './test-release-neon.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const check = (value, reason) => { if (!value) throw new VerificationError(reason); };
const migrationName = '20261117193000_anniversary_publication';
let installationStarted = false;

export async function readComparableSnapshot(client) {
  // Match readBranch exactly: pg_get_constraintdef/pg_get_indexdef depend on object visibility.
  await client.query('SET LOCAL search_path = pg_catalog');
  return readSnapshot((_, sql) => client.query(sql));
}

export function snapshotDifferences(left, right) {
  const changedTables = [...new Set([...Object.keys(left.data), ...Object.keys(right.data)])]
    .filter(name => hash(left.data[name] ?? null) !== hash(right.data[name] ?? null))
    .map(table => ({ table, beforeCount: left.data[table]?.length ?? 0, afterCount: right.data[table]?.length ?? 0 }));
  const key = row => JSON.stringify([row.kind, row.object, row.name]);
  const before = new Map(left.schema.map(row => [key(row), row]));
  const after = new Map(right.schema.map(row => [key(row), row]));
  const changedSchemaObjects = [...new Set([...before.keys(), ...after.keys()])]
    .filter(id => hash(before.get(id) ?? null) !== hash(after.get(id) ?? null))
    .map(id => { const row = after.get(id) ?? before.get(id); return { kind: row.kind, table: row.object, name: row.name }; });
  return { dataEqual: changedTables.length === 0, schemaEqual: changedSchemaObjects.length === 0, changedTables, changedSchemaObjects };
}

async function diagnoseSnapshots(pair) {
  const previous = JSON.parse(readFileSync(root + 'upmandex-migration-exports/anniversary-launch-1795027915619.json', 'utf8'));
  const client = new pg.Client(cloneConnectionConfig(pair.targetUrl));
  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY');
    const originalPath = (await client.query('SHOW search_path')).rows[0].search_path;
    const canonical = await readComparableSnapshot(client);
    await client.query("SELECT pg_catalog.set_config('search_path', $1, true)", [originalPath]);
    const defaultContext = await readSnapshot((_, sql) => client.query(sql));
    const context = snapshotDifferences(canonical, defaultContext);
    const current = snapshotDifferences(pair.current, canonical);
    const migration = readFileSync(root + 'prisma/migrations/' + migrationName + '/migration.sql', 'utf8');
    const approvalFingerprint = hash({ target: pair.target, backup: pair.backup,
      targetSnapshot: hash(pair.current), backupSnapshot: hash(pair.saved), migration });
    const approvalMatches = approvalFingerprint === previous.approvalFingerprint;
    console.log(JSON.stringify({ outcome: 'diagnosed-read-only',
      previousApprovalMatches: approvalMatches, currentApprovalFingerprint: approvalFingerprint,
      approvalComponents: { targetIdentityMatches: hash(previous.target) === hash(pair.target),
        backupIdentityMatches: hash(previous.backup) === hash(pair.backup),
        targetSnapshotMatches: previous.targetSnapshotHash === hash(pair.current),
        backupSnapshotMatches: previous.backupSnapshotHash === hash(pair.saved),
        migrationMatches: previous.migrationHash === hash(migration) },
      approvedSnapshotStillMatches: previous.targetSnapshotHash === hash(canonical),
      preflightVersusCanonical: current, canonicalVersusDefaultContext: context,
      cause: !context.schemaEqual && context.dataEqual && current.dataEqual && current.schemaEqual
        ? 'search_path-dependent-schema-serialization' : 'inspect-reported-differences',
      newAuthorizationRequired: !approvalMatches || !current.dataEqual || !current.schemaEqual,
      remoteWritesPerformed: false, installationStarted: false }, null, 2));
  } finally { await client.end().catch(() => {}); }
}

async function installPublication(pair, approved) {
  // Only invoked by the separate explicit install command; never by the default preflight.
  const client = new pg.Client(cloneConnectionConfig(pair.targetUrl));
  const temporary = root + 'upmandex-migration-exports/production-publication-' + Date.now() + '.config.ts';
  try {
    await client.connect();
    await client.query('BEGIN READ WRITE');
    await client.query("SET LOCAL lock_timeout = '5s'");
    const { rows: tables } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('SitePublication','_prisma_migrations') ORDER BY tablename");
    const quoted = tables.map(row => 'public.\"' + row.tablename.replaceAll('"', '""') + '\"');
    await client.query('LOCK TABLE ' + quoted.join(',') + ' IN SHARE MODE');
    const before = await readComparableSnapshot(client);
    const drift = snapshotDifferences(pair.current, before);
    check(hash(before) === hash(pair.current), 'Écart de lecture avant migration : '
      + (!drift.dataEqual ? 'données des tables ' + drift.changedTables.map(row => row.table).join(', ')
        : !drift.schemaEqual ? 'définitions du schéma' : 'sérialisation du snapshot') + '. Aucune migration exécutée.');
    const local = new Map(readdirSync(root + 'prisma/migrations', { withFileTypes: true }).filter(row => row.isDirectory()).map(row => {
      const raw = readFileSync(root + 'prisma/migrations/' + row.name + '/migration.sql', 'utf8');
      const lf = raw.replaceAll('\r\n', '\n');
      const checksum = value => createHash('sha256').update(value).digest('hex');
      return [row.name, [checksum(raw), checksum(lf), checksum(lf.replaceAll('\n', '\r\n'))]];
    }));
    const history = (await client.query('SELECT * FROM public."_prisma_migrations" ORDER BY id')).rows;
    const applied = verifyMigrationHistory(history, local);
    if (!applied) {
      const url = new URL(pair.targetUrl);
      url.hostname = url.hostname.replace(/^([^.]+?)-pooler\./, '$1.');
      url.searchParams.set('sslmode', 'require'); url.searchParams.set('sslaccept', 'strict');
      writeFileSync(temporary, 'import { defineConfig } from "prisma/config";export default defineConfig({schema:'
        + JSON.stringify(root + 'prisma/schema.prisma') + ',migrations:{path:' + JSON.stringify(root + 'prisma/migrations')
        + '},datasource:{url:process.env.UPMANDEX_RELEASE_TEST_URL}});', { flag: 'wx', mode: 0o600 });
      installationStarted = true;
      const child = spawnSync(process.execPath, [root + 'node_modules/prisma/build/index.js', 'migrate', 'deploy', '--config', temporary], {
        cwd: root, encoding: 'utf8', timeout: 120_000,
        env: { ...process.env, UPMANDEX_RELEASE_TEST_URL: url.href, DATABASE_URL: url.href },
      });
      const code = (child.stdout + child.stderr).match(/\bP\d{4}\b/)?.[0];
      check(child.status === 0, 'Migration Release interrompue' + (code ? ' (' + code + ')' : '') + '. Aucun nouvel essai automatique.');
    }
    const state = (await client.query('SELECT status, version, history FROM public."SitePublication" WHERE id=\'anniversary\'' )).rows[0];
    check(state?.status === 'PRIVATE' && (applied || (state.version === 0 && state.history.length === 0)), 'État PRIVATE initial non confirmé.');
    check(verifyMigrationHistory((await client.query('SELECT * FROM public."_prisma_migrations" ORDER BY id')).rows, local), 'Migration Release non enregistrée.');
    const after = await readSnapshot((_, sql) => client.query(sql));
    const business = data => Object.fromEntries(Object.entries(data).map(([name, rows]) => [name,
      name === '_prisma_migrations' ? rows.filter(row => row.migration_name !== migrationName) : rows]));
    check(hash(business(before.data)) === hash(business(after.data)), 'Une donnée existante a changé : contrôle manuel requis.');
    await client.query('COMMIT');
    const independent = new pg.Client(cloneConnectionConfig(pair.targetUrl));
    try {
      await independent.connect();
      await independent.query('BEGIN READ ONLY');
      check((await independent.query('SELECT status FROM public."SitePublication" WHERE id=\'anniversary\'' )).rows[0]?.status === 'PRIVATE', 'PRIVATE non confirmé après reconnexion.');
      const fresh = await readComparableSnapshot(independent);
      check(hash(business(after.data)) === hash(business(fresh.data)), 'La relecture indépendante des données diverge.');
    } finally { await independent.end().catch(() => {}); }
    return { outcome: 'publication-installed-private', approvalFingerprint: approved, state: 'PRIVATE', businessDataUnchanged: true, publicReleaseTriggered: false };
  } finally {
    await client.query('ROLLBACK').catch(() => {}); await client.end().catch(() => {});
    try { unlinkSync(temporary); } catch { /* No temporary configuration exists. */ }
  }
}

export function inspectLaunchData(data) {
  const counts = Object.fromEntries(['User', 'Upman', 'Inventory', 'PersonAchievement'].map(name => [name, data[name]?.length]));
  check(JSON.stringify(Object.values(counts)) === JSON.stringify([80, 44, 482, 43]), 'Compteurs Anniversary différents des volumes validés.');
  const owners = data.User.filter(row => row.twitchLogin?.trim().toLowerCase() === 'upreal_');
  check(owners.length === 1 && owners[0].role === 'ADMIN' && /^[1-9]\d{0,29}$/.test(owners[0].twitchUserId ?? ''),
    'Le propriétaire upreal_ doit être un administrateur déjà lié à son ID Twitch stable. Aucun compte modifié.');
  const media = ['Upman', 'UpmanSubmission', 'PersonArtwork', 'ProfileCosmeticAsset'].flatMap(table =>
    (data[table] ?? []).flatMap(row => {
      if (typeof row.image !== 'string') return [];
      let url;
      try { url = new URL(row.image); } catch { return []; }
      if (!/^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(url.hostname)) return [];
      return [{ table, id: row.id, url: row.image, review: table === 'UpmanSubmission'
        ? 'submission-public-original-review' : table === 'ProfileCosmeticAsset' && row.ownerUserId
          ? 'personal-background-review' : 'anniversary-content-review' }];
    }));
  return { counts, ownerId: owners[0].twitchUserId, media };
}

async function main() {
  const args = process.argv.slice(2);
  const install = args[0] === '--install-publication=anniversary';
  const diagnose = args.length === 1 && args[0] === '--diagnose-snapshot';
  check(args.length === 0 || diagnose || (install && args.length === 2 && /^--approved-plan=[a-f0-9]{64}$/.test(args[1])),
    'Sans argument : lecture seule. Installation réelle : confirmation anniversary et empreinte explicitement approuvée requises.');
  const prefix = 'upmandex-migration-exports/anniversary-launch-' + Date.now();
  const reportPath = prefix + '.json';
  const envPath = prefix + '.env';
  const pair = await readVerifiedPair(reportPath); // Live API identities and SQL READ ONLY, including backup.
  checkIntegrity(pair.current.data);
  checkIntegrity(pair.saved.data);
  if (diagnose) { await diagnoseSnapshots(pair); return; }
  const inspected = inspectLaunchData(pair.current.data);
  let publication = { status: 'PRIVATE', migration: 'pending', initialStateGuaranteedBySqlDefault: true };
  if (pair.current.schema.some(row => row.object === 'SitePublication')) {
    const client = new pg.Client(cloneConnectionConfig(pair.targetUrl));
    try {
      await client.connect();
      await client.query('BEGIN READ ONLY');
      const { rows } = await client.query('SELECT status, version FROM public."SitePublication" WHERE id = \'anniversary\'');
      check(rows.length === 1 && rows[0].status === 'PRIVATE', 'Publication non PRIVATE ou état incohérent : arrêter avant déploiement.');
      publication = { ...rows[0], migration: 'table-present-history-to-confirm' };
    } finally { await client.end().catch(() => {}); }
  }
  const migration = readFileSync(root + 'prisma/migrations/' + migrationName + '/migration.sql', 'utf8');
  const approvalFingerprint = hash({ target: pair.target, backup: pair.backup,
    targetSnapshot: hash(pair.current), backupSnapshot: hash(pair.saved), migration });
  if (install) {
    check(args[1] === '--approved-plan=' + approvalFingerprint, 'Empreinte différente : aucune migration exécutée.');
    console.log(JSON.stringify(await installPublication(pair, approvalFingerprint), null, 2));
    return;
  }
  const report = {
    approvalFingerprint,
    verifiedAt: new Date().toISOString(), target: pair.target, backup: pair.backup,
    targetSnapshotHash: hash(pair.current), backupSnapshotHash: hash(pair.saved),
    counts: inspected.counts, backupCounts: Object.fromEntries(['User', 'Upman', 'Inventory', 'PersonAchievement'].map(name => [name, pair.saved.data[name].length])),
    publication, migrationName, migrationHash: hash(migration),
    ownerVerifiedAdminAndLinked: true, allowedUsersPrepared: 1,
    publicBlobReferences: inspected.media, blobListingComplete: false,
    mediaDecisionRequired: inspected.media.length > 0,
    remainingRemoteChecks: ['Vercel project/domain/protection and effective Production variables', 'Twitch registered callback', 'Blob listing including unreferenced objects'],
    rollback: 'Previous deployment with its original environment snapshot; never restore the pre-reconciliation backup over the current 80-user database.',
  };
  const variables = {
    DATABASE_URL: pair.targetUrl.href, UPMANDEX_ENV: 'anniversary', UPMANDEX_PRIVATE_ACCESS: '1',
    UPMANDEX_PRIVATE_TWITCH_IDS: inspected.ownerId, UPMANDEX_RELEASE_ADMIN_TWITCH_ID: inspected.ownerId,
    UPMANDEX_RELEASE_READY: '0', UPMANDEX_ADMIN_TEST_PREVIEW: '0',
    AUTH_URL: 'https://upmandex.com', NEXTAUTH_URL: 'https://upmandex.com',
  };
  const ignored = execFileSync('git', ['check-ignore', '--', envPath], { cwd: root, encoding: 'utf8' }).trim();
  check(ignored === envPath, 'Le fichier de configuration généré doit être ignoré par Git.');
  writeFileSync(root + reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  writeFileSync(root + envPath, '# PRIVATE configuration, owner only. Preserve existing OAuth and machine secrets.\n'
    + '# Review before copying to Vercel Production. This file performs no remote update.\n'
    + Object.entries(variables).map(([key, value]) => key + '=' + JSON.stringify(value)).join('\n') + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ outcome: 'verified-read-only', approvalFingerprint, counts: inspected.counts,
    ownerVerified: true, publication, publicBlobReferencesToReview: inspected.media.length,
    privateReport: reportPath, privateProductionConfiguration: envPath,
    remoteChangesPerformed: false }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  atStage('Préparation de la mise en ligne PRIVATE', main).catch(error => {
    const installRequested = process.argv.includes('--install-publication=anniversary');
    console.log(JSON.stringify({ outcome: 'blocked', diagnostic: error.message,
      ...(installRequested ? { installationMayHaveOccurred: installationStarted, automaticRetry: false } : { remoteChangesPerformed: false }) }, null, 2));
    process.exitCode = 1;
  });
}
