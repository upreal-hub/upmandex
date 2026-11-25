// PostgreSQL integration test. Writes are restricted to the existing, API-verified 4G-D clone.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import pg from 'pg';
import { atStage, identify, loadConfig, neonGet, VerificationError } from './lot-4g-b-verify.mjs';
import { cloneConnectionConfig } from './lot-4f-c-simulation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const targetName = 'anniversary-reconciliation-4g-d-2026-11-17';
const migration = '20261117193000_anniversary_publication';
const digest = value => createHash('sha256').update(value).digest('hex');
const check = (value, message) => { if (!value) throw new VerificationError(message); };
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const quote = name => '"' + name.replaceAll('"', '""') + '"';

export function verifyClone(branch, endpoint, target, backup) {
  check(/^br-[a-z0-9-]+$/.test(branch?.id) && branch.name === targetName
    && branch.parent_id === backup.branch.id
    && ![target.branch.id, backup.branch.id].includes(branch.id), 'Identité ou parent du clone de test incorrect.');
  check(endpoint?.branch_id === branch.id && endpoint.type === 'read_write'
    && /^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)*\.neon\.tech$/.test(endpoint.host)
    && endpoint.host.split('.')[0] === endpoint.id
    && ![target.endpointId, backup.endpointId].includes(endpoint.id), 'Endpoint isolé non confirmé.');
}

export function verifyMigrationHistory(rows, local) {
  const applied = new Map();
  for (const row of rows) {
    const expected = local.get(row.migration_name);
    check(row.finished_at && !row.rolled_back_at && !applied.has(row.migration_name)
      && (Array.isArray(expected) ? expected.includes(row.checksum) : expected === row.checksum),
    'Historique Prisma incomplet, divergent ou en échec.');
    applied.set(row.migration_name, row);
  }
  check([...local.keys()].every(name => name === migration || applied.has(name)),
    'Une migration autre que la publication serait nécessaire : arrêt.');
  return applied.has(migration);
}

async function main(result) {
  check(process.argv.length === 2 && git('branch', '--show-current') === 'anniversary', 'Exécuter sans argument sur la branche anniversary.');
  const privatePath = 'upmandex-migration-exports/';
  const configPath = privatePath + 'anniversary-migration.env';
  check(git('check-ignore', '--', configPath) === configPath && !git('ls-files', '--', privatePath), 'La configuration privée doit être ignorée et non suivie.');
  const config = loadConfig(readFileSync(root + configPath, 'utf8'), process.env.NEON_API_KEY);
  result.stage = 'identity';
  const token = config.NEON_API_KEY;
  const target = await identify('anniversary', config.ANNIVERSARY_BRANCH_ID, config.ANNIVERSARY_DATABASE_URL, token);
  const backup = await identify('backup-anniversary-before-migration-2026-11-17', config.ANNIVERSARY_BACKUP_BRANCH_ID, config.ANNIVERSARY_BACKUP_DATABASE_URL, token);
  check(backup.branch.parent_id === target.branch.id && backup.branch.id !== target.branch.id
    && backup.endpointId !== target.endpointId, 'Identité de la sauvegarde incorrecte.');
  const list = await neonGet('/branches?search=' + targetName, token, 'recherche du clone existant');
  const branches = list.branches?.filter(branch => branch.name === targetName);
  check(branches?.length === 1 && !list.pagination?.cursor, 'Clone existant introuvable ou recherche ambiguë. Aucune branche créée.');
  const branch = branches[0];
  const computes = await neonGet('/branches/' + branch.id + '/endpoints', token, 'endpoint du test');
  const endpoints = computes.endpoints?.filter(endpoint => endpoint.type === 'read_write');
  check(endpoints?.length === 1, 'Le clone doit avoir un endpoint read_write unique.');
  verifyClone(branch, endpoints[0], target, backup);
  const url = new URL(config.ANNIVERSARY_BACKUP_DATABASE_URL);
  url.hostname = endpoints[0].host; // Same credential inheritance as the validated 4G-D tool.
  url.searchParams.set('sslmode', 'require');
  url.searchParams.set('sslaccept', 'strict'); // Prisma's native connector must also validate TLS.
  const clone = await identify(targetName, branch.id, url.href, token);
  check(clone.branch.parent_id === backup.branch.id && clone.endpointId === endpoints[0].id, 'Identité du clone non confirmée.');
  result.target = targetName;
  const connection = cloneConnectionConfig(url); // Certificate AND hostname validation; read-only by default.
  async function connect() { const client = new pg.Client(connection); try { await client.connect(); return client; } catch (error) { await client.end().catch(() => {}); throw error; } }
  async function query(sql, values = [], write = false) {
    const client = await connect();
    try {
      if (write) await client.query('BEGIN READ WRITE');
      const response = await client.query(sql, values);
      if (write) await client.query('COMMIT');
      return response.rows;
    } catch (error) {
      if (/^[0-9A-Z]{5}$/.test(error.code ?? '')) result.sqlstate = error.code;
      throw error;
    } finally { await client.end().catch(() => {}); }
  }
  const holder = await connect();
  let start, service, actor;
  const tempConfig = root + privatePath + 'publication-test-' + randomUUID() + '.config.ts';
  try {
    result.stage = 'baseline';
    await holder.query('BEGIN READ WRITE');
    await holder.query("SET LOCAL lock_timeout = '5s'");
    const { rows: tables } = await holder.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('SitePublication', '_prisma_migrations') ORDER BY tablename");
    check(['User', 'Upman', 'Inventory', 'PersonAchievement'].every(name => tables.some(row => row.tablename === name)), 'Tables Anniversary manquantes.');
    await holder.query('LOCK TABLE ' + tables.map(row => 'public.' + quote(row.tablename)).join(', ') + ' IN SHARE MODE');
    async function snapshot() {
      const data = {};
      for (const { tablename } of tables) {
        const { rows } = await holder.query('SELECT to_jsonb(t) AS value FROM public.' + quote(tablename) + ' t');
        data[tablename] = { count: rows.length, hash: digest(rows.map(row => JSON.stringify(row.value)).sort().join('\n')) };
      }
      return data;
    }
    const before = await snapshot();
    check(isDeepStrictEqual(['User', 'Upman', 'Inventory', 'PersonAchievement'].map(name => before[name].count), [80, 44, 482, 43]), 'Le clone ne possède pas les volumes finaux attendus.');
    const local = new Map(readdirSync(root + 'prisma/migrations', { withFileTypes: true }).filter(row => row.isDirectory())
      .map(row => {
        const raw = readFileSync(root + 'prisma/migrations/' + row.name + '/migration.sql', 'utf8');
        const lf = raw.replaceAll('\r\n', '\n');
        // Prisma accepts the equivalent LF/CRLF migration checksums on Windows.
        return [row.name, [digest(raw), digest(lf), digest(lf.replaceAll('\n', '\r\n'))]];
      }));
    const historyBefore = (await holder.query('SELECT * FROM public."_prisma_migrations" ORDER BY id')).rows;
    const applied = verifyMigrationHistory(historyBefore, local);
    const admins = await query('SELECT "twitchUserId" FROM public."User" WHERE role = \'ADMIN\' AND "twitchUserId" IS NOT NULL ORDER BY id');
    actor = admins[0]?.twitchUserId;
    check(/^[1-9]\d{0,29}$/.test(actor ?? ''), 'Aucun administrateur lié disponible sur le clone.');
    result.stage = 'publication-migration';
    if (!applied) {
      check(!(await query("SELECT to_regclass('public.\"SitePublication\"') AS name"))[0].name, 'Table de publication présente sans migration enregistrée.');
      // Explicit temporary config: never load .env.local or run the business reconciliation.
      writeFileSync(tempConfig, 'import { defineConfig } from "prisma/config"; export default defineConfig({schema:'
        + JSON.stringify(root + 'prisma/schema.prisma') + ',migrations:{path:' + JSON.stringify(root + 'prisma/migrations')
        + '},datasource:{url:process.env.UPMANDEX_RELEASE_TEST_URL}});', { flag: 'wx', mode: 0o600 });
      result.writesStarted = true;
      const child = spawnSync(process.execPath, [root + 'node_modules/prisma/build/index.js', 'migrate', 'deploy', '--config', tempConfig], {
        cwd: root, encoding: 'utf8', timeout: 120_000,
        env: { ...process.env, UPMANDEX_RELEASE_TEST_URL: url.href, DATABASE_URL: url.href },
      });
      const prismaCode = (child.stderr + child.stdout).match(/\bP\d{4}\b/)?.[0];
      check(child.status === 0, 'Migration Prisma de publication échouée' + (prismaCode ? ' (' + prismaCode + ')' : '')
        + (child.error?.code === 'ETIMEDOUT' ? ' (délai dépassé)' : '') + '. Aucun test Release lancé.');
    }
    result.migration = applied ? 'already-applied' : 'applied';
    const historyAfter = await query('SELECT * FROM public."_prisma_migrations" ORDER BY id');
    check(verifyMigrationHistory(historyAfter, local), 'Migration de publication non confirmée.');
    check(isDeepStrictEqual(historyBefore.filter(row => row.migration_name !== migration), historyAfter.filter(row => row.migration_name !== migration)), 'Historique des autres migrations modifié.');
    start = (await query('SELECT * FROM public."SitePublication" WHERE id = \'anniversary\''))[0];
    check(start?.status === 'PRIVATE' && Number.isSafeInteger(start.version) && Array.isArray(start.history), 'La publication doit être PRIVATE au début du test.');
    check(!(await query("SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.\"SitePublication\"'::regclass AND NOT tgisinternal")).length, 'Trigger inattendu sur la publication.');
    result.stage = 'release-handlers';
    // Only SQL is real here. Session identities and unused OAuth/Blob services are test fixtures.
    Object.assign(process.env, { DATABASE_URL: url.href, UPMANDEX_ENV: 'anniversary', UPMANDEX_PRIVATE_ACCESS: '1',
      UPMANDEX_ADMIN_TEST_PREVIEW: '1', VERCEL_ENV: 'preview', UPMANDEX_TEST_DATABASE_HOST: url.hostname,
      UPMANDEX_RELEASE_ADMIN_TWITCH_ID: actor, UPMANDEX_PRIVATE_TWITCH_IDS: actor + ',999999999999999999999999999999',
      UPMANDEX_RELEASE_READY: '1', AUTH_SECRET: 'isolated-test-unused', AUTH_TWITCH_ID: 'isolated-test-unused',
      AUTH_TWITCH_SECRET: 'isolated-test-unused', PRIVATE_BLOB_READ_WRITE_TOKEN: 'isolated-test-unused' });
    globalThis.prisma = { $queryRaw: async (parts, ...values) => {
      const sql = parts.reduce((text, part, index) => text + (index ? '$' + index : '') + part, '');
      check(/^\s*(?:SELECT\b|UPDATE "SitePublication"\s)/.test(sql), 'Instruction hors périmètre du test.');
      return query(sql, values, /^\s*UPDATE/.test(sql));
    } };
    const hook = registerHooks({ resolve(specifier, context, next) {
      return next(specifier === 'server-only' ? 'next/dist/compiled/server-only/empty.js' : specifier, context);
    } });
    service = await import('../lib/site-publication.ts');
    const { createPublicationHandlers } = await import('../lib/site-publication-handler.ts');
    let identity = null;
    const handlers = createPublicationHandlers(async () => {
      const user = identity ? (await query('SELECT role FROM public."User" WHERE "twitchUserId" = $1', [identity]))[0] : null;
      return user?.role === 'ADMIN' ? identity : null;
    });
    const request = (status, version, confirmation = status === 'PUBLIC' ? 'Release UPMANDEX' : 'Return to PRIVATE') => new Request('https://isolated.example.test/api/admin/release', {
      method: 'POST', headers: { origin: 'https://isolated.example.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ status, version, confirmation }),
    });
    check((await handlers.POST(request('PUBLIC', start.version))).status === 403, 'Un visiteur anonyme peut modifier la publication.');
    identity = '999999999999999999999999999999';
    check((await handlers.POST(request('PUBLIC', start.version))).status === 403, 'Un compte non administrateur peut modifier la publication.');
    const regular = (await query('SELECT "twitchUserId" FROM public."User" WHERE role = \'USER\' AND "twitchUserId" IS NOT NULL ORDER BY id LIMIT 1'))[0];
    check(regular, 'Aucun utilisateur ordinaire lié disponible pour le test de permissions.');
    identity = regular.twitchUserId;
    check((await handlers.POST(request('PUBLIC', start.version))).status === 403, 'Un utilisateur ordinaire peut modifier la publication.');
    identity = actor;
    check((await handlers.POST(request('PUBLIC', start.version, ''))).status === 400, 'Confirmation explicite non exigée.');
    result.writesStarted = true;
    result.finalState = 'unknown';
    const raced = await Promise.all([handlers.POST(request('PUBLIC', start.version)), handlers.POST(request('PUBLIC', start.version))]);
    check(isDeepStrictEqual(raced.map(row => row.status).sort(), [200, 409]), 'Résultat inattendu des demandes concurrentes.');
    check((await query('SELECT status FROM public."SitePublication" WHERE id = \'anniversary\''))[0].status === 'PUBLIC', 'PUBLIC non persistant après reconnexion.');
    check((await handlers.POST(request('PRIVATE', start.version + 1))).status === 200, 'Retour PRIVATE échoué.');
    const final = (await query('SELECT * FROM public."SitePublication" WHERE id = \'anniversary\''))[0];
    const entries = final.history.slice(start.history.length);
    check(final.status === 'PRIVATE' && final.version === start.version + 2 && entries.length === 2
      && isDeepStrictEqual(entries.map(row => [row.from, row.to, row.actorTwitchId, row.version]), [
        ['PRIVATE', 'PUBLIC', actor, start.version + 1], ['PUBLIC', 'PRIVATE', actor, start.version + 2]])
      && entries.every(row => Number.isFinite(Date.parse(row.at)))
      && isDeepStrictEqual(final.history.slice(0, start.history.length), start.history), 'État final ou journal incorrect.');
    check(isDeepStrictEqual(before, await snapshot()), 'Une donnée métier a changé.');
    await holder.query('COMMIT');
    hook.deregister();
    result.outcome = 'passed';
    result.stage = 'complete';
    result.finalState = 'PRIVATE';
    result.counts = { users: 80, upmans: 44, possessions: 482, achievements: 43 };
    result.permissions = 'sessions simulées; rôles PostgreSQL et handlers applicatifs réels; OAuth non testé';
    result.checks = { identity: true, persistenceAfterReconnect: true, confirmation: true, concurrentRequests: true, audit: true, businessDataUnchanged: true };
  } finally {
    // Never leave this test's PUBLIC transition active following a later assertion failure.
    if (result.outcome !== 'passed' && service && start) {
      const current = await query('SELECT status, version FROM public."SitePublication" WHERE id = \'anniversary\'').catch(() => []);
      if (current[0]?.status === 'PUBLIC' && current[0].version === start.version + 1) {
        result.emergencyPrivate = Boolean(await service.changePublication({ status: 'PRIVATE', version: current[0].version }, actor).catch(() => null));
      }
      const verified = await query('SELECT status FROM public."SitePublication" WHERE id = \'anniversary\'').catch(() => []);
      result.finalState = verified[0]?.status ?? 'unknown';
    }
    await holder.query('ROLLBACK').catch(() => {});
    await holder.end().catch(() => {});
    try { unlinkSync(tempConfig); } catch { /* No configuration created, or already removed. */ }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = { outcome: 'blocked', stage: 'configuration' };
  await atStage('Test Release sur clone isolé', () => main(result)).catch(error => {
    result.outcome = result.writesStarted ? 'failed' : 'blocked';
    result.diagnostic = error.message;
    process.exitCode = 1;
  });
  console.log(JSON.stringify(result, null, 2));
}
