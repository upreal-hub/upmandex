import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';
import pg from 'pg';
import { buildPlan, cloneConnectionConfig, modelTables, readProduction } from './lot-4f-c-simulation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const privateDir = 'upmandex-migration-exports/';
const configPath = privateDir + 'anniversary-migration.env';
const project = 'late-paper-17187204';
const targetName = 'anniversary';
const backupName = 'backup-anniversary-before-migration-2026-11-17';
const reference = '4da8d88f015db58d4a171cb60394c33a8f26dcfc043c5ab05d6910c5a490dc78';
const keyOverrides = {
  PersonArtworkLike: ['userId', 'artworkId'],
  PersonProjectLike: ['userId', 'projectId'],
  PullRarityRule: ['rarity'],
};
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

class VerificationError extends Error {}
function requireCheck(condition, message) {
  if (!condition) throw new VerificationError(message);
}
async function atStage(stage, action) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof VerificationError) throw error;
    const causes = [error, error?.cause, ...(error?.errors ?? []), ...(error?.cause?.errors ?? [])];
    const codes = causes.map(cause => cause?.code);
    let detail;
    if (codes.some(code => ['ENOTFOUND', 'EAI_AGAIN', 'EAI_FAIL'].includes(code))) {
      detail = 'DNS (' + codes.find(code => ['ENOTFOUND', 'EAI_AGAIN', 'EAI_FAIL'].includes(code)) + ')';
    } else if (codes.some(code => typeof code === 'string' && /^(ERR_TLS_|ERR_SSL_|CERT_|UNABLE_TO_|SELF_SIGNED_|DEPTH_ZERO_)/.test(code))) {
      detail = 'TLS : négociation ou certificat refusé';
    } else if (error?.name === 'TimeoutError' || error?.name === 'AbortError'
      || codes.some(code => ['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'ECONNREFUSED', 'ECONNRESET', 'EACCES', 'ENETUNREACH'].includes(code))) {
      detail = 'connexion réseau refusée, interrompue ou délai dépassé';
    } else if (typeof error?.severity === 'string' && /^[0-9A-Z]{5}$/.test(error.code)) {
      detail = (error.code.startsWith('28') ? 'authentification PostgreSQL, ' : '') + 'SQLSTATE ' + error.code;
    } else {
      detail = 'échec, détails privés masqués';
    }
    throw new VerificationError(stage + ' : ' + detail + '.');
  }
}

function loadConfig(contents, fallbackToken) {
  const config = parseEnv(contents.replace(/^\uFEFF/, ''));
  for (const key of ['ANNIVERSARY_BRANCH_ID', 'ANNIVERSARY_DATABASE_URL', 'ANNIVERSARY_BACKUP_BRANCH_ID',
    'ANNIVERSARY_BACKUP_DATABASE_URL']) {
    requireCheck(config[key], `Configuration : ${key} absente ou vide.`);
  }
  const token = config.NEON_API_KEY || fallbackToken;
  requireCheck(token && !/\s|[^\x21-\x7e]/.test(token), 'Configuration : NEON_API_KEY absente ou mal formée.');
  return { ...config, NEON_API_KEY: token };
}

const safePlanMessages = new Set([
  'Identifiant vide ou collision de normalisation.',
  'Format de date inattendu.',
  'Date invalide.',
  'État intermédiaire ou volume inattendu.',
  'Utilisateur hors export.',
  'Correspondance de slug incomplète.',
  'Import de rôle privilégié interdit.',
  'Attribution historique au nouveau Nuttella interdite.',
  'Dates historiques KidUpman inattendues.',
  'Réconciliation différente des volumes approuvés.',
]);

function checkReferencePlan(source, data) {
  try {
    return buildPlan(source, data);
  } catch (error) {
    const message = error?.message;
    let reason = safePlanMessages.has(message) ? message : undefined;
    for (const table of modelTables) {
      if (message === `Compteur inattendu : ${table}.`) {
        reason = `Compteur inattendu : ${table} (${data[table].length} lignes lues).`;
      } else if (message === `Clé primaire absente ou invalide : ${table}.`) {
        reason = message;
      } else if (typeof message === 'string' && message.startsWith(`Relation invalide : ${table}.`)) {
        reason = `Relation invalide dans ${table}.`;
      }
    }
    if (!reason) throw error;
    throw new VerificationError('Comparaison des données avec le plan 4F-C : ' + reason);
  }
}

function matchesWithoutOneAchievement(snapshot, expectedHash) {
  const rows = snapshot.data.PersonAchievement;
  if (rows.length !== 43) return false;
  let matches = 0;
  for (let index = 0; index < rows.length; index++) {
    const data = { ...snapshot.data, PersonAchievement: rows.filter((_, position) => position !== index) };
    if (hash({ ...snapshot, data }) === expectedHash) matches++;
  }
  return matches === 1;
}
function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

async function neonGet(path, token, scope) {
  return atStage('API Neon · ' + scope, async () => {
    const response = await fetch(`https://console.neon.tech/api/v2/projects/${project}${path}`, {
      headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(15_000),
    });
    requireCheck(response.ok, `API Neon · ${scope} : HTTP ${response.status}.`);
    return response.json();
  });
}

async function identify(name, branchId, connection, token) {
  requireCheck(/^br-[a-z0-9-]+$/.test(branchId ?? ''), `Identifiant Neon manquant pour ${name}.`);
  const url = await atStage(`Configuration de l’URL · ${name}`, () => new URL(connection));
  requireCheck(url.protocol === 'postgresql:' && /^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)*\.neon\.tech$/.test(url.hostname)
    && (!url.port || url.port === '5432') && url.pathname === '/neondb' && url.username && url.password,
  `Connexion non conforme pour ${name}.`);
  const directHost = url.hostname.replace(/^([^.]+?)-pooler\./, '$1.');
  const endpointId = directHost.split('.')[0];
  const [{ endpoint }, { branch }] = await Promise.all([
    neonGet('/endpoints/' + endpointId, token, `${name}, endpoint`),
    neonGet('/branches/' + branchId, token, `${name}, branche`),
  ]);
  requireCheck(endpoint?.id === endpointId && endpoint.host === directHost && endpoint.branch_id === branchId
    && branch?.id === branchId && branch.name === name, `Identité Neon incohérente pour ${name}.`);
  return { url, branch, endpointId };
}

async function readBranch(url, name) {
  const client = await atStage(`Configuration PostgreSQL · ${name}`, () => new pg.Client(cloneConnectionConfig(url)));
  try {
    await atStage(`Connexion PostgreSQL · ${name}`, () => client.connect());
    const query = (scope, sql) => atStage(`${scope} · ${name}`, () => client.query(sql));
    await query('Ouverture de la transaction en lecture seule', 'BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY');
    try {
      const { rows: modes } = await query('Contrôle du mode SQL', 'SHOW transaction_read_only');
      requireCheck(modes[0]?.transaction_read_only === 'on', 'Transaction en lecture seule non confirmée.');
      await query('Configuration de la transaction', 'SET LOCAL search_path = pg_catalog');
      const snapshot = await readSnapshot(query);
      await query('Fin de la transaction en lecture seule', 'ROLLBACK');
      return snapshot;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    }
  } finally {
    await client.end().catch(() => {});
  }
}

async function readSnapshot(query) {
  const data = {};
  for (const name of modelTables) {
    const order = (keyOverrides[name] ?? ['id']).map(key => `t."${key}" COLLATE "C"`).join(', ');
    const { rows } = await query(`Lecture de la table ${name}`, `SELECT to_jsonb(t) AS data FROM public."${name}" AS t ORDER BY ${order}`);
    data[name] = rows.map(row => row.data);
  }
  const { rows: schema } = await query('Lecture du schéma', `
    SELECT 'column' AS kind, table_name AS object, column_name AS name,
      jsonb_build_array(ordinal_position, udt_schema, udt_name, is_nullable, column_default,
        character_maximum_length, numeric_precision, numeric_scale, datetime_precision,
        collation_name, is_identity, is_generated, generation_expression) AS definition
    FROM information_schema.columns WHERE table_schema = 'public'
    UNION ALL
    SELECT 'constraint', c.relname, k.conname, jsonb_build_array(pg_get_constraintdef(k.oid), k.convalidated)
    FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public'
    UNION ALL
    SELECT 'index', tablename, indexname, to_jsonb(indexdef) FROM pg_indexes WHERE schemaname = 'public'
    UNION ALL
    SELECT 'trigger', c.relname, t.tgname, jsonb_build_array(pg_get_triggerdef(t.oid), t.tgenabled)
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND NOT t.tgisinternal
    ORDER BY 1, 2, 3
  `);
  return { data, schema };
}

async function readVerifiedPair(reportPath) {
  requireCheck(git('branch', '--show-current') === 'anniversary', 'Branche Git inattendue.');
  requireCheck(git('check-ignore', '--', configPath) === configPath && !git('ls-files', '--', privateDir),
    'La configuration privée doit rester hors Git.');
  if (reportPath) {
    requireCheck(git('check-ignore', '--', reportPath) === reportPath, 'Le rapport privé doit rester hors Git.');
  }
  requireCheck(existsSync(root + configPath), 'Configuration privée anniversary-migration.env absente.');
  const config = await atStage('Configuration du fichier privé', () =>
    loadConfig(readFileSync(root + configPath, 'utf8'), process.env.NEON_API_KEY));
  const token = config.NEON_API_KEY;
  const [target, backup] = await Promise.all([
    identify(targetName, config.ANNIVERSARY_BRANCH_ID, config.ANNIVERSARY_DATABASE_URL, token),
    identify(backupName, config.ANNIVERSARY_BACKUP_BRANCH_ID, config.ANNIVERSARY_BACKUP_DATABASE_URL, token),
  ]);
  requireCheck(backup.branch.id !== target.branch.id && backup.branch.parent_id === target.branch.id
    && backup.endpointId !== target.endpointId, 'La sauvegarde doit être une branche distincte issue d’Anniversary.');

  const current = await readBranch(target.url, targetName);
  const saved = await readBranch(backup.url, backupName);
  const identity = ({ url, branch, endpointId }) => ({
    project, name: branch.name, branchId: branch.id, endpointId, hostname: url.hostname, database: url.pathname.slice(1),
  });
  return { current, saved, target: identity(target), backup: identity(backup), token,
    targetUrl: target.url, backupUrl: backup.url };
}

async function main() {
  requireCheck(process.argv.length === 2, 'Cet outil accepte uniquement une vérification sans argument.');
  const { current, saved, target, backup } = await readVerifiedPair();
  const source = await atStage('Lecture des exports Production', readProduction);
  const historical = await atStage('Lecture de la référence 4F-C', () =>
    JSON.parse(readFileSync(root + privateDir + 'simulation-attestation.json', 'utf8').replace(/^\uFEFF/, '')));
  requireCheck(historical.projectId === project && historical.branch === 'anniversary-reconciliation-sim-2026-11-14'
    && historical.parent === targetName && typeof historical.hostname === 'string',
  'Référence historique 4F-C absente ou incohérente.');

  requireCheck(hash(current.schema) === hash(saved.schema), 'Différence de schéma entre Anniversary et la sauvegarde.');
  const differences = modelTables.flatMap(table => {
    const before = saved.data[table];
    const after = current.data[table];
    return hash(before) === hash(after) ? [] : [{ table, backup: before.length, target: after.length }];
  });
  requireCheck(!differences.length, 'Divergence entre Anniversary et la sauvegarde : ' + JSON.stringify(differences));
  const exports = { users: source.users, inventory: source.inventory, mappedSlugs: source.mappedSlugs };
  // The archived host is only used to reconstruct the 4F-C digest. It is never contacted.
  const historicalSnapshot = { version: '4f-c-1', hostname: historical.hostname, data: current.data, ...exports };
  if (current.data.PersonAchievement.length === 43) {
    const detail = matchesWithoutOneAchievement(historicalSnapshot, reference)
      ? 'Une seule ligne supplémentaire explique tout l’écart avec l’empreinte 4F-C.'
      : 'Retirer une ligne en mémoire ne suffit pas à retrouver de manière unique l’empreinte 4F-C.';
    throw new VerificationError('PersonAchievement : 43 lignes au lieu de 42. ' + detail + ' Plan non validé.');
  }
  const plan = await atStage('Comparaison des données avec le plan 4F-C', () => checkReferencePlan(source, current.data));
  requireCheck(plan.initial && plan.absentFirstOwners === 5, 'État initial ou premiers propriétaires historiques inattendus.');
  const equivalent = hash(historicalSnapshot);
  requireCheck(equivalent === reference, 'Les lignes de départ ou les exports diffèrent du plan initial 4F-C validé.');
  const fingerprint = hash({
    version: '4g-b-1', project, target: target.branchId, backup: backup.branchId,
    hostname: target.hostname, backupHostname: backup.hostname, current, saved, exports,
  });
  console.log(JSON.stringify({
    target: targetName, backup: backupName, verifiedAt: new Date().toISOString(), fingerprint,
    reference4FCMatches: true, backupMatches: true,
    counts: Object.fromEntries(modelTables.map(table => [table, current.data[table].length])),
    operations: {
      usersToImport: plan.imports.length, possessionsToAdd: plan.additions.length, common: plan.common,
      datesToUpdate: plan.dates.length, countersToUpdate: plan.owners.length, anniversaryOnly: plan.retained,
      historicalFirstOwners: plan.absentFirstOwners,
    },
    projected: { users: 80, upmans: 44, possessions: 482 },
  }, null, 2));
}

export { atStage, loadConfig, checkReferencePlan, matchesWithoutOneAchievement, readVerifiedPair,
  neonGet, identify, readBranch, readSnapshot, VerificationError };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  atStage('Démarrage de la vérification', main).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
