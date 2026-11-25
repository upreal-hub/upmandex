import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';
import pg from 'pg';

const root = fileURLToPath(new URL('../', import.meta.url));
const privateDir = 'upmandex-migration-exports';
const envPath = `${privateDir}/simulation.env`;
const attestationPath = `${privateDir}/simulation-attestation.json`;
const cloneName = 'anniversary-reconciliation-sim-2026-11-14';
const projectId = 'late-paper-17187204';
const tables = {
  User: 54, Upman: 44, Inventory: 342, Person: 28, PersonAchievement: 42,
  PullEvent: 142, UpmanSubmission: 4, ProfileCosmeticAsset: 6,
  PersonArtwork: 9, PersonProject: 2, UpmanAcquisitionGrant: 3, _prisma_migrations: 21,
};

class CheckError extends Error {}
function check(condition, message) {
  if (!condition) throw new CheckError(message);
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function exportRows(time, columns, count) {
  const file = `${projectId}_production_neondb_2026-11-12_${time}.csv`;
  const csv = readFileSync(join(root, privateDir, file), 'utf8').replace(/^\uFEFF/, '');
  const rows = [];
  const record = /(?:"(?:[^"]|"")*"|[^",\r\n]*)(?:,(?:"(?:[^"]|"")*"|[^",\r\n]*))*(?:\r?\n|$)/gy;
  const field = /(?:^|,)(?:"((?:[^"]|"")*)"|([^",\r\n]*))/gy;
  let offset = 0;
  while (offset < csv.length) {
    const match = record.exec(csv);
    check(match?.[0], 'CSV invalide.');
    offset = record.lastIndex;
    const line = match[0].replace(/\r?\n$/, '');
    const values = [];
    field.lastIndex = 0;
    for (let index = 0; index < columns.length; index++) {
      const cell = field.exec(line);
      check(cell, 'Colonne CSV manquante.');
      values.push(cell[1]?.replaceAll('""', '"') ?? cell[2]);
    }
    check(field.lastIndex === line.length, 'Colonnes CSV inattendues.');
    rows.push(values);
  }
  check(rows.shift()?.join(',') === columns.join(',') && rows.length === count,
    'En-tête ou compteur CSV inattendu.');
  return rows.map(values => Object.fromEntries(columns.map((column, index) => [column, values[index]])));
}

const normalize = value => value.trim().toLowerCase();
const pair = (login, slug) => JSON.stringify([login, slug]);
function indexed(rows, key) {
  const result = new Map();
  for (const row of rows) {
    const id = key(row);
    check(id && !result.has(id), 'Identifiant vide ou collision de normalisation.');
    result.set(id, row);
  }
  return result;
}

function timestamp(value) {
  // Prisma stores these columns without a timezone. The exports use UTC.
  const iso = value.replace(' ', 'T');
  const match = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,3}))?Z?$/.exec(iso);
  check(match, 'Format de date inattendu.');
  const canonical = `${match[1]}.${(match[2] ?? '').padEnd(3, '0')}Z`;
  const date = new Date(canonical);
  check(Number.isFinite(date.valueOf()) && date.toISOString() === canonical, 'Date invalide.');
  return canonical;
}

function readProduction() {
  const users = exportRows('21-12-54', ['normalized_login', 'displayName', 'role', 'createdAt'], 80)
    .map(row => ({ twitchLogin: normalize(row.normalized_login), displayName: row.displayName,
      role: row.role, createdAt: timestamp(row.createdAt) }));
  const catalog = exportRows('21-13-08', ['normalized_slug', 'name', 'image', 'rarity', 'creator',
    'creatorTwitch', 'ownersCount', 'firstOwner', 'createdAt'], 37);
  const slugs = indexed(catalog, row => normalize(row.normalized_slug));
  const userIndex = indexed(users, row => row.twitchLogin);
  for (const row of users) {
    check(row.displayName && ['USER', 'ADMIN'].includes(row.role), 'Profil source invalide.');
  }
  const inventory = exportRows('21-07-00', ['normalized_login', 'normalized_slug', 'obtainedAt'], 467)
    .map(row => {
      const login = normalize(row.normalized_login);
      const sourceSlug = normalize(row.normalized_slug);
      check(userIndex.has(login) && slugs.has(sourceSlug), 'Possession source orpheline.');
      return { login, slug: sourceSlug === 'nuttellaupman' ? 'ezraupman' : sourceSlug,
        obtainedAt: timestamp(row.obtainedAt) };
    });
  indexed(inventory, row => pair(row.login, row.slug));
  const mappedSlugs = [...slugs.keys()].map(slug => slug === 'nuttellaupman' ? 'ezraupman' : slug);
  check(new Set(mappedSlugs).size === slugs.size, 'Collision de mapping des Upmans.');
  return { users, userIndex, inventory, mappedSlugs };
}

async function verifyEndpoint(url, apiKey) {
  check(apiKey, 'NEON_API_KEY absente. Identité du clone non vérifiée, connexion SQL bloquée.');
  const base = `https://console.neon.tech/api/v2/projects/${projectId}`;
  async function get(path) {
    const response = await fetch(base + path, {
      headers: { Authorization: `Bearer ${apiKey}` },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    check(response.ok, `Métadonnées Neon inaccessibles (HTTP ${response.status}).`);
    return response.json();
  }
  const endpointId = url.hostname.split('.')[0].replace(/-pooler$/, '');
  const { endpoint } = await get(`/endpoints/${endpointId}`);
  const host = endpoint?.host;
  const directHost = url.hostname.replace(/^([^.]+?)-pooler\./, '$1.');
  check(endpoint?.id === endpointId && host === directHost && /^br-[a-z0-9-]+$/.test(endpoint.branch_id),
    'Le compute Neon ne correspond pas à l’hôte configuré.');
  const { branch } = await get(`/branches/${endpoint.branch_id}`);
  check(branch?.id === endpoint.branch_id && branch.name === cloneName
    && /^br-[a-z0-9-]+$/.test(branch.parent_id), 'Le compute Neon ne cible pas le clone attendu.');
  const { branch: parent } = await get(`/branches/${branch.parent_id}`);
  check(parent?.id === branch.parent_id && parent.name === 'anniversary', 'Parent Neon inattendu.');
}

function verifyAttestation(url) {
  check(git('check-ignore', '--', attestationPath) === attestationPath,
    'L’attestation doit rester hors Git.');
  const proof = JSON.parse(readFileSync(join(root, attestationPath), 'utf8'));
  const age = Date.now() - Date.parse(proof.recordedAt);
  check(proof.projectId === projectId && proof.branch === cloneName && proof.parent === 'anniversary'
    && proof.hostname === url.hostname && age >= 0 && age < 24 * 60 * 60 * 1000,
  'Attestation locale expirée ou cible différente de celle attestée.');
}

async function readClone(url) {
  // Use explicit fields to prevent URL options from overriding the verified host or TLS.
  const client = new pg.Client({
    host: url.hostname, port: 5432, database: decodeURIComponent(url.pathname.slice(1)),
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: true, servername: url.hostname }, enableChannelBinding: true,
    options: '-c default_transaction_read_only=on',
    connectionTimeoutMillis: 12_000, statement_timeout: 15_000,
  });
  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const mode = await client.query('SHOW transaction_read_only');
    check(mode.rows[0]?.transaction_read_only === 'on', 'Transaction non protégée.');
    const counters = {};
    for (const [table, expected] of Object.entries(tables)) {
      const { rows } = await client.query(`SELECT count(*)::int AS count FROM public."${table}"`);
      check(rows[0].count === expected, `Compteur initial inattendu pour ${table}.`);
      counters[table] = rows[0].count;
    }
    const { rows: users } = await client.query('SELECT id, "twitchLogin" FROM public."User"');
    const { rows: upmans } = await client.query('SELECT id, slug, "ownersCount", "firstOwner" FROM public."Upman"');
    const { rows: inventory } = await client.query(`
      SELECT id, "userId", "upmanId", "obtainedAt"::text AS "obtainedAt"
      FROM public."Inventory"
    `);
    return { users, upmans, inventory, counters };
  } catch (error) {
    if (error instanceof CheckError) throw error;
    const code = /^[A-Z0-9_]{3,40}$/.test(error.code ?? '') ? ` (${error.code})` : '';
    throw new CheckError(`Lecture PostgreSQL interrompue${code}.`);
  } finally {
    // Closing the connection aborts the transaction, including on any validation error.
    await client.end();
  }
}

export function preparePlan(production, clone) {
  const users = indexed(clone.users, row => normalize(row.twitchLogin));
  const upmans = indexed(clone.upmans, row => normalize(row.slug));
  const userIds = indexed(clone.users, row => row.id);
  const upmanIds = indexed(clone.upmans, row => row.id);
  check(production.mappedSlugs.every(slug => upmans.has(slug)) && upmans.has('nuttellaupman'),
    'Un Upman cible est absent.');
  check([...users.keys()].every(login => production.userIndex.has(login)), 'Utilisateur Anniversary hors export.');
  const imports = production.users.filter(row => !users.has(row.twitchLogin));
  check(imports.every(row => row.role === 'USER'), 'Import de rôle privilégié bloqué.');
  const existing = indexed(clone.inventory.map(row => {
    const login = userIds.get(row.userId)?.twitchLogin;
    const slug = upmanIds.get(row.upmanId)?.slug;
    check(login && slug, 'Possession clone orpheline.');
    return { id: row.id, login: normalize(login), slug: normalize(slug),
      obtainedAt: timestamp(row.obtainedAt) };
  }), row => pair(row.login, row.slug));
  const additions = [];
  const common = [];
  const merged = new Map(existing);
  const productionPairs = new Set();
  for (const row of production.inventory) {
    const key = pair(row.login, row.slug);
    productionPairs.add(key);
    const before = existing.get(key);
    if (before) {
      common.push({ ...row, id: before.id, previousObtainedAt: before.obtainedAt });
    } else {
      additions.push({ ...row, userId: users.get(row.login)?.id ?? null, upmanId: upmans.get(row.slug).id });
    }
    merged.set(key, row);
  }
  const retained = [...existing].filter(([key]) => !productionPairs.has(key)).map(([, row]) => row);
  const kidUpman = common.find(row => row.login === 'upreal_' && row.slug === 'kidupman');
  check(kidUpman, 'La possession commune upreal_/KidUpman est absente.');
  const totals = { users: users.size + imports.length, upmans: upmans.size, inventory: merged.size };
  check(imports.length === 26 && additions.length === 140 && common.length === 327
    && retained.length === 15 && totals.users === 80 && totals.upmans === 44 && totals.inventory === 482,
  'Le plan ne correspond pas aux volumes approuvés du lot 4F-B.');
  const ownersBySlug = new Map([...upmans.keys()].map(slug => [slug, new Set()]));
  for (const row of merged.values()) ownersBySlug.get(row.slug).add(row.login);
  const ownerChecks = [...upmans].map(([slug, row]) => ({
    id: row.id, previousOwnersCount: row.ownersCount, ownersCount: ownersBySlug.get(slug).size,
    firstOwner: row.firstOwner,
    firstOwnerIsHolder: row.firstOwner ? ownersBySlug.get(slug).has(normalize(row.firstOwner)) : null,
  }));
  return { imports, additions, common, retained, totals, kidUpman, ownerChecks };
}

async function main() {
  check(git('branch', '--show-current') === 'anniversary', 'La branche Git active doit être anniversary.');
  check(git('check-ignore', '--', envPath) === envPath && !git('ls-files', '--', privateDir),
    'Les données de simulation doivent rester hors Git.');
  const args = process.argv.slice(2);
  check(args.length === 0 || (args.length === 1
    && ['--check-exports', '--use-console-attestation'].includes(args[0])), 'Option inconnue.');
  const production = readProduction();
  if (args[0] === '--check-exports') {
    console.log(JSON.stringify({ users: production.users.length, upmans: production.mappedSlugs.length,
      inventory: production.inventory.length, databaseContacted: false }, null, 2));
    return;
  }
  const config = parseEnv(readFileSync(join(root, envPath), 'utf8'));
  check(config.SIMULATION_DATABASE_URL, 'SIMULATION_DATABASE_URL absente.');
  const url = new URL(config.SIMULATION_DATABASE_URL);
  check(url.protocol === 'postgresql:' && /^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)*\.neon\.tech$/.test(url.hostname)
    && (!url.port || url.port === '5432') && url.pathname === '/neondb'
    && url.username && url.password, 'URL Neon inattendue.');
  const useAttestation = args[0] === '--use-console-attestation';
  if (useAttestation) {
    verifyAttestation(url);
  } else {
    await verifyEndpoint(url, config.NEON_API_KEY ?? process.env.NEON_API_KEY);
  }
  const clone = await readClone(url);
  const plan = preparePlan(production, clone);
  console.log(JSON.stringify({
    verifiedBranch: cloneName, identitySource: useAttestation ? 'manual-neon-console' : 'neon-api',
    initial: clone.counters, projected: plan.totals,
    usersToImport: plan.imports.length, possessionsToAdd: plan.additions.length,
    commonDates: plan.common.length, commonDatesDiffering: plan.common.filter(
      row => row.obtainedAt !== row.previousObtainedAt).length,
    anniversaryOnlyDates: plan.retained.length,
    ownersCountsDiffering: plan.ownerChecks.filter(row => row.ownersCount !== row.previousOwnersCount).length,
    firstOwnersOutsideInventory: plan.ownerChecks.filter(row => row.firstOwnerIsHolder === false).length,
    kidUpman: { anniversary: plan.kidUpman.previousObtainedAt, production: plan.kidUpman.obtainedAt },
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    // Driver, parser and transport errors can contain connection details or private rows.
    console.error(error instanceof CheckError ? error.message : 'Contrôle interrompu. Détails privés masqués.');
    process.exitCode = 1;
  });
}
