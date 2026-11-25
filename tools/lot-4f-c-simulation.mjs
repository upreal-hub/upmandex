import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
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

// CSV parsing and Neon identity checks mirror Lot 4F-B, whose entry point stays unchanged.
class CheckError extends Error {}
function safeDiagnostic(error, stage) {
  if (error instanceof CheckError) return error.message;
  const code = error?.code ?? error?.cause?.code;
  if (["ENOTFOUND", "EAI_AGAIN", "EAI_FAIL"].includes(code)) return `Résolution DNS (${code}).`;
  if (typeof code === "string" && /^(ERR_TLS_|ERR_SSL_|CERT_|UNABLE_TO_VERIFY_|SELF_SIGNED_|DEPTH_ZERO_SELF_SIGNED_|UNABLE_TO_GET_)/.test(code)) {
    return "TLS : négociation ou validation du certificat échouée.";
  }
  if (code === "28P01" || code === "28000") return `Authentification PostgreSQL (SQLSTATE ${code}).`;
  if (["42P01", "42703", "3F000", "3D000", "42804"].includes(code)) {
    return `Schéma ou base PostgreSQL inattendus (SQLSTATE ${code}).`;
  }
  if (["ETIMEDOUT", "ECONNREFUSED", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH", "EACCES"].includes(code)) {
    return `Connexion réseau (${code}).`;
  }
  if (error?.name === "error" && typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) {
    return `${stage} (SQLSTATE ${code}).`;
  }
  return `${stage} : échec, détails privés masqués.`;
}
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
  const contents = readFileSync(join(root, attestationPath), 'utf8').replace(/^\uFEFF/, '');
  let proof;
  try {
    proof = JSON.parse(contents);
  } catch {
    throw new CheckError('Configuration : JSON de l’attestation locale invalide.');
  }
  const age = Date.now() - Date.parse(proof?.recordedAt);
  check(proof?.projectId === projectId && proof.branch === cloneName && proof.parent === 'anniversary'
    && proof.hostname === url.hostname && age >= 0 && age < 24 * 60 * 60 * 1000,
  'Attestation locale expirée ou cible différente de celle attestée.');
}

const modelTables = ["User","Person","ProfileCosmeticAsset","PersonLink","PersonProject","PersonArtwork","PersonArtworkLike","PersonProjectLike","PersonAchievement","Upman","UpmanSubmission","UpmanEvent","UpmanAcquisitionRule","UpmanAcquisitionGrant","TwitchAchievementEvent","StreamContext","PullRarityRule","PullEvent","Inventory","ActivityLog","_prisma_migrations"];
const relations = [
  ["Person","userId","User"],
  ["Person","equippedCustomBackgroundId","ProfileCosmeticAsset"],
  ["Person","equippedCustomBannerId","ProfileCosmeticAsset"],
  ["ProfileCosmeticAsset","ownerUserId","User"],
  ["PersonLink","personId","Person"],
  ["PersonProject","personId","Person"],
  ["PersonArtwork","personId","Person"],
  ["PersonArtworkLike","userId","User"],
  ["PersonArtworkLike","artworkId","PersonArtwork"],
  ["PersonProjectLike","userId","User"],
  ["PersonProjectLike","projectId","PersonProject"],
  ["PersonAchievement","personId","Person"],
  ["Upman","creatorPersonId","Person"],
  ["Upman","representedPersonId","Person"],
  ["UpmanSubmission","userId","User"],
  ["UpmanSubmission","reviewedByUserId","User"],
  ["UpmanSubmission","approvedUpmanId","Upman"],
  ["UpmanAcquisitionRule","upmanId","Upman"],
  ["UpmanAcquisitionRule","eventId","UpmanEvent"],
  ["UpmanAcquisitionGrant","ruleId","UpmanAcquisitionRule"],
  ["UpmanAcquisitionGrant","userId","User"],
  ["UpmanAcquisitionGrant","upmanId","Upman"],
  ["TwitchAchievementEvent","userId","User"],
  ["PullEvent","userId","User"],
  ["PullEvent","upmanId","Upman"],
  ["Inventory","upmanId","Upman"],
  ["Inventory","userId","User"],
  ["ActivityLog","actorUserId","User"],
  ["ActivityLog","targetUserId","User"],
  ["ActivityLog","upmanId","Upman"],
  ["ActivityLog","personId","Person"],
];

const kidBefore = '2026-09-22T10:44:53.215Z';
const kidAfter = '2026-11-11T15:48:18.426Z';
const key = row => pair(row.userId, row.upmanId);
const quote = name => '"' + name + '"';
const table = name => 'public.' + quote(name);
const primaryKeys = {
  PersonArtworkLike: ['userId', 'artworkId'],
  PersonProjectLike: ['userId', 'projectId'],
  PullRarityRule: ['rarity'],
};
const keyColumns = name => primaryKeys[name] ?? ['id'];

function snapshotKey(name, row) {
  const values = keyColumns(name).map(column => row[column]);
  check(values.every(value => typeof value === 'string' && value.length > 0),
    'Clé primaire absente ou invalide : ' + name + '.');
  return JSON.stringify(values);
}

function parseArguments(args) {
  const flags = new Set(args);
  const modes = ['--verify', '--dry-run', '--apply'].filter(flag => flags.delete(flag));
  check(modes.length <= 1 && new Set(args).size === args.length, 'Mode ambigu.');
  const mode = modes[0] ?? '--verify';
  const manual = flags.delete('--use-console-attestation');
  const approval = [...flags].find(flag => /^--approved-plan=[0-9a-f]{64}$/.test(flag));
  if (approval) flags.delete(approval);
  const confirmation = '--confirm-' + mode.slice(2) + '=' + cloneName;
  const confirmed = flags.delete(confirmation);
  check(flags.size === 0 && (mode === '--verify'
    ? !approval && !confirmed
    : Boolean(approval) && confirmed), 'Arguments invalides ou autorisation explicite manquante.');
  return { mode, manual, approval: approval?.split('=')[1] };
}

async function snapshot(client) {
  const result = {};
  for (const name of modelTables) {
    const order = keyColumns(name).map(column => 't.' + quote(column) + ' COLLATE "C"').join(', ');
    try {
      const { rows } = await client.query(
        'SELECT to_jsonb(t) AS data FROM ' + table(name) + ' AS t ORDER BY ' + order);
      result[name] = rows.map(row => row.data);
    } catch (error) {
      if (error.code === '42703') {
        throw new CheckError('SQLSTATE 42703 dans snapshot(), ' + table(name)
          + ' : colonnes de tri attendues ' + keyColumns(name).map(quote).join(', ') + '.');
      }
      throw error;
    }
  }
  return result;
}

function checkIntegrity(data) {
  const indexes = Object.fromEntries(modelTables.map(name => {
    const keys = indexed(data[name], row => snapshotKey(name, row));
    return [name, keys];
  }));
  for (const [child, field, parent] of relations) {
    check(data[child].every(row => Object.hasOwn(row, field)
      && (row[field] === null || indexes[parent].has(JSON.stringify([row[field]])))),
    'Relation invalide : ' + child + '.' + field + '.');
  }
  indexed(data.Inventory, key);
  indexed(data.User, row => normalize(row.twitchLogin));
  indexed(data.Upman, row => normalize(row.slug));
}

function buildPlan(source, data) {
  checkIntegrity(data);
  for (const [name, count] of Object.entries(tables)) {
    if (name !== 'User' && name !== 'Inventory') {
      check(data[name].length === count, 'Compteur inattendu : ' + name + '.');
    }
  }
  const initial = data.User.length === 54 && data.Inventory.length === 342;
  const final = data.User.length === 80 && data.Inventory.length === 482;
  check(initial || final, 'État intermédiaire ou volume inattendu.');
  const users = indexed(data.User, row => normalize(row.twitchLogin));
  const upmans = indexed(data.Upman, row => normalize(row.slug));
  check([...users.keys()].every(login => source.userIndex.has(login)), 'Utilisateur hors export.');
  check(upmans.has('nuttellaupman') && source.mappedSlugs.every(slug => upmans.has(slug)),
    'Correspondance de slug incomplète.');
  const imports = source.users.filter(row => !users.has(row.twitchLogin));
  check(imports.every(row => row.role === 'USER'), 'Import de rôle privilégié interdit.');

  const inventory = indexed(data.Inventory, key);
  const additions = [];
  const dates = [];
  const commonIds = new Set();
  const ownerCounts = new Map(data.Upman.map(row => [row.id, 0]));
  const currentOwners = new Map(data.Upman.map(row => [row.id, new Set()]));
  const userById = indexed(data.User, row => row.id);
  for (const row of data.Inventory) {
    ownerCounts.set(row.upmanId, ownerCounts.get(row.upmanId) + 1);
    currentOwners.get(row.upmanId).add(normalize(userById.get(row.userId).twitchLogin));
  }
  let kidUpman;
  for (const row of source.inventory) {
    const userId = users.get(row.login)?.id;
    const upmanId = upmans.get(row.slug).id;
    check(row.slug !== 'nuttellaupman', 'Attribution historique au nouveau Nuttella interdite.');
    const existing = userId ? inventory.get(pair(userId, upmanId)) : undefined;
    if (!existing) {
      additions.push({ ...row, upmanId });
      ownerCounts.set(upmanId, ownerCounts.get(upmanId) + 1);
      continue;
    }
    commonIds.add(existing.id);
    const before = timestamp(existing.obtainedAt);
    if (before !== row.obtainedAt) dates.push({ id: existing.id, before, after: row.obtainedAt });
    if (row.login === 'upreal_' && row.slug === 'kidupman') kidUpman = { before, after: row.obtainedAt };
  }
  check(kidUpman?.before === (initial ? kidBefore : kidAfter) && kidUpman.after === kidAfter,
    'Dates historiques KidUpman inattendues.');
  const retained = data.Inventory.length - commonIds.size;
  const owners = data.Upman.filter(row => row.ownersCount !== ownerCounts.get(row.id))
    .map(row => ({ id: row.id, before: row.ownersCount, after: ownerCounts.get(row.id) }));
  const absentFirstOwners = data.Upman.filter(row => row.firstOwner
    && !currentOwners.get(row.id).has(normalize(row.firstOwner))).length;
  const expectedCounts = initial ? [26, 140, 327, 21, 30] : [0, 0, 467, 0, 0];
  check(retained === 15 && isDeepStrictEqual(
    [imports.length, additions.length, commonIds.size, dates.length, owners.length], expectedCounts),
  'Réconciliation différente des volumes approuvés.');
  return { initial, imports, additions, dates, owners, retained, common: commonIds.size,
    absentFirstOwners, kidUpman, userIds: new Map([...users].map(([login, row]) => [login, row.id])) };
}

function digest(source, data, hostname) {
  return createHash('sha256').update(JSON.stringify({
    version: '4f-c-1', hostname, data, users: source.users, inventory: source.inventory,
    mappedSlugs: source.mappedSlugs,
  })).digest('hex');
}

async function applyPlan(client, data, plan) {
  const expected = structuredClone(data);
  const ids = new Map(plan.userIds);
  const exactlyOne = async (sql, values) => {
    const result = await client.query(sql, values);
    check(result.rowCount === 1, 'Une opération n’a pas affecté exactement la ligne attendue.');
  };
  for (const user of plan.imports) {
    // Prisma String IDs are supplied by the caller for raw SQL. UUIDs fit the text columns.
    const id = randomUUID();
    await exactlyOne(`
      INSERT INTO public."User" (id, "twitchLogin", "displayName", role, "createdAt", "twitchUserId", avatar)
      VALUES ($1, $2, $3, $4, $5::timestamp, NULL, NULL)
    `, [id, user.twitchLogin, user.displayName, user.role, user.createdAt]);
    ids.set(user.twitchLogin, id);
    expected.User.push({ id, ...user, twitchUserId: null, avatar: null });
  }
  for (const row of plan.additions) {
    const id = randomUUID();
    const userId = ids.get(row.login);
    check(userId, 'Remappage utilisateur absent.');
    await exactlyOne(`
      INSERT INTO public."Inventory" (id, "userId", "upmanId", "obtainedAt")
      VALUES ($1, $2, $3, $4::timestamp)
    `, [id, userId, row.upmanId, row.obtainedAt]);
    expected.Inventory.push({ id, userId, upmanId: row.upmanId, obtainedAt: row.obtainedAt });
  }
  const expectedInventory = indexed(expected.Inventory, row => row.id);
  for (const row of plan.dates) {
    await exactlyOne(`
      UPDATE public."Inventory" SET "obtainedAt" = $1::timestamp
      WHERE id = $2 AND "obtainedAt" = $3::timestamp AND "obtainedAt" IS DISTINCT FROM $1::timestamp
    `, [row.after, row.id, row.before]);
    expectedInventory.get(row.id).obtainedAt = row.after;
  }
  const expectedUpmans = indexed(expected.Upman, row => row.id);
  for (const row of plan.owners) {
    await exactlyOne(`
      UPDATE public."Upman" AS u SET "ownersCount" = calculated.total
      FROM (SELECT count(*)::int AS total FROM public."Inventory" WHERE "upmanId" = $1) AS calculated
      WHERE u.id = $1 AND u."ownersCount" = $2 AND calculated.total = $3
        AND u."ownersCount" IS DISTINCT FROM calculated.total
    `, [row.id, row.before, row.after]);
    expectedUpmans.get(row.id).ownersCount = row.after;
  }
  return expected;
}

function validateChanges(expected, after) {
  for (const name of modelTables) {
    const sort = rows => [...rows].sort((a, b) => {
      const left = snapshotKey(name, a);
      const right = snapshotKey(name, b);
      return left < right ? -1 : (left === right ? 0 : 1);
    });
    const canonical = rows => sort(rows).map(row => {
      if (name === 'User') return { ...row, createdAt: timestamp(row.createdAt) };
      if (name === 'Inventory') return { ...row, obtainedAt: timestamp(row.obtainedAt) };
      return row;
    });
    check(isDeepStrictEqual(canonical(expected[name]), canonical(after[name])),
      'Changement inattendu après simulation : ' + name + '.');
  }
}

async function lockAuditedTables(client) {
  await client.query('SET LOCAL lock_timeout = 5000');
  // Prevent concurrent DML on audited tables before the first data snapshot.
  await client.query('LOCK TABLE ' + [...modelTables].sort().map(table).join(', ')
    + ' IN SHARE ROW EXCLUSIVE MODE');
  const { rows: hooks } = await client.query(`
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE NOT tgisinternal AND tgenabled <> 'D'
      AND tgrelid IN ('public."User"'::regclass, 'public."Inventory"'::regclass, 'public."Upman"'::regclass)
    UNION ALL
    SELECT 1 FROM pg_catalog.pg_rewrite
    WHERE ev_enabled <> 'D'
      AND ev_class IN ('public."User"'::regclass, 'public."Inventory"'::regclass, 'public."Upman"'::regclass)
  `);
  check(hooks.length === 0, 'Trigger ou règle personnalisée sur une table d’écriture.');
}

async function runTransaction(client, options, source, hostname, saveReport) {
  const writable = options.mode !== '--verify';
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE ' + (writable ? 'READ WRITE' : 'READ ONLY'));
  let open = true;
  try {
    const { rows } = await client.query('SHOW transaction_read_only');
    check(rows[0]?.transaction_read_only === (writable ? 'off' : 'on'), 'Mode SQL inattendu.');
    // Apply these settings to the transaction, where the pooled server connection is pinned.
    await client.query('SET LOCAL search_path = pg_catalog');
    if (writable) {
      await lockAuditedTables(client);
    }
    const before = await snapshot(client);
    let plan;
    try {
      plan = buildPlan(source, before);
    } catch (error) {
      throw new CheckError(error instanceof CheckError
        ? `Incohérence de données : ${error.message}`
        : 'Incohérence de données : le format des lignes lues est inattendu.');
    }
    const fingerprint = digest(source, before, hostname);
    const result = {
      mode: options.mode, state: plan.initial ? 'initial' : 'final',
      fingerprint, usersToImport: plan.imports.length, possessionsToAdd: plan.additions.length,
      commonPossessions: plan.common, datesToUpdate: plan.dates.length,
      anniversaryOnly: plan.retained, countersToUpdate: plan.owners.length,
      absentFirstOwnersBefore: plan.absentFirstOwners,
      projected: { users: 80, upmans: 44, possessions: 482 },
    };
    check(!writable || !plan.initial || fingerprint === options.approval,
      'Empreinte du plan différente de celle approuvée.');
    if (writable && plan.initial) {
      const expected = await applyPlan(client, before, plan);
      await client.query('SET CONSTRAINTS ALL IMMEDIATE');
      const after = await snapshot(client);
      validateChanges(expected, after);
      check(!buildPlan(source, after).initial, 'État final non reconnu.');
      result.firstOwnerUnchanged = true;
      // If the private report cannot be written, roll back before any commit.
      result.privateReport = saveReport({ ...result, kidUpman: plan.kidUpman,
        note: 'Plan contrôlé avant fin de transaction. Ce fichier ne prouve pas un COMMIT.' });
    }
    const commit = options.mode === '--apply' && plan.initial;
    const end = await client.query(commit ? 'COMMIT' : 'ROLLBACK');
    open = false;
    check(end.command === (commit ? 'COMMIT' : 'ROLLBACK'), 'Fin de transaction inattendue.');
    return { ...result, outcome: commit ? 'committed' : (writable && plan.initial ? 'rolled-back' : 'no-writes') };
  } catch (error) {
    if (open) await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') throw new CheckError('Conflit d’unicité. Transaction annulée.');
    if (['40001', '40P01', '55P03'].includes(error.code)) {
      throw new CheckError('Concurrence détectée. Transaction interrompue, aucune relance automatique.');
    }
    throw error;
  }
}

function cloneConnectionConfig(url) {
  // Use the same startup parameters as the validated Lot 4F-B connection.
  // Pass explicit fields so URL query parameters cannot override TLS.
  return {
    host: url.hostname, port: 5432, database: decodeURIComponent(url.pathname.slice(1)),
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: true, servername: url.hostname }, enableChannelBinding: true,
    options: '-c default_transaction_read_only=on',
    connectionTimeoutMillis: 12_000, statement_timeout: 15_000,
  };
}

async function main(diagnostic) {
  check(git('branch', '--show-current') === 'anniversary', 'Branche Git inattendue.');
  check(git('check-ignore', '--', envPath) === envPath && !git('ls-files', '--', privateDir),
    'Les données de simulation doivent rester hors Git.');
  const options = parseArguments(process.argv.slice(2));
  diagnostic.stage = 'Configuration des exports Production';
  const source = readProduction();
  diagnostic.stage = 'Configuration de la connexion au clone';
  const config = parseEnv(readFileSync(join(root, envPath), 'utf8'));
  const url = new URL(config.SIMULATION_DATABASE_URL);
  check(url.protocol === 'postgresql:' && /^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)*\.neon\.tech$/.test(url.hostname)
    && (!url.port || url.port === '5432') && url.pathname === '/neondb'
    && url.username && url.password, 'URL Neon inattendue.');
  diagnostic.stage = 'Vérification d’identité du clone';
  if (options.manual) verifyAttestation(url);
  else await verifyEndpoint(url, config.NEON_API_KEY ?? process.env.NEON_API_KEY);

  const client = new pg.Client(cloneConnectionConfig(url));
  try {
    diagnostic.stage = 'Connexion PostgreSQL au clone';
    await client.connect();
    diagnostic.stage = 'Requête SQL sur le clone';
    const result = await runTransaction(client, options, source, url.hostname, report => {
      const filename = privateDir + '/lot-4f-c-' + randomUUID() + '.json';
      check(git('check-ignore', '--', filename) === filename, 'Rapport privé non ignoré par Git.');
      writeFileSync(join(root, filename), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      return filename;
    });
    console.log(JSON.stringify({ identitySource: options.manual ? 'manual-neon-console' : 'neon-api',
      clone: cloneName, ...result }, null, 2));
  } finally {
    await client.end();
  }
}

export { parseArguments, readProduction, runTransaction, modelTables, buildPlan, validateChanges, cloneConnectionConfig, applyPlan, lockAuditedTables, checkIntegrity };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const diagnostic = { stage: 'Configuration Git ou arguments' };
  main(diagnostic).catch(error => {
    console.error(safeDiagnostic(error, diagnostic.stage));
    process.exitCode = 1;
  });
}
