import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { modelTables, readProduction } from './lot-4f-c-simulation.mjs';
import { atStage, readVerifiedPair } from './lot-4g-b-verify.mjs';

const hashBytes = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = value => hashBytes(JSON.stringify(value));
const normalize = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const pair = (user, upman) => JSON.stringify([user, upman]);
const referenceCounts = { User: 54, Upman: 44, Inventory: 342, Person: 28, PersonAchievement: 42,
  PullEvent: 142, UpmanSubmission: 4, ProfileCosmeticAsset: 6, PersonArtwork: 9, PersonProject: 2,
  UpmanAcquisitionGrant: 3, _prisma_migrations: 21 };
const referenceOperations = { usersToImport: 26, possessionsToAdd: 140, common: 327,
  datesToUpdate: 21, countersToUpdate: 30, anniversaryOnly: 15, historicalFirstOwners: 5 };
const exportNames = ['21-07-00', '21-12-54', '21-13-08']
  .map(time => `late-paper-17187204_production_neondb_2026-11-12_${time}.csv`);

function timestamp(value) {
  const match = typeof value === 'string'
    && /^(\d{4}-\d\d-\d\d)[T ](\d\d:\d\d:\d\d)(?:\.(\d{1,3}))?Z?$/.exec(value);
  if (!match) return null;
  const iso = `${match[1]}T${match[2]}.${(match[3] ?? '').padEnd(3, '0')}Z`;
  const date = new Date(iso);
  return Number.isFinite(date.valueOf()) && date.toISOString() === iso ? iso : null;
}

export function reconcile(source, data) {
  const conflicts = [];
  const preservedRoleDifferences = [];
  function index(table, field, key) {
    const entries = new Map();
    for (const row of data[table]) {
      const value = key(row);
      if (!value || entries.has(value)) conflicts.push({ type: 'clé absente ou dupliquée', table, field, id: row.id });
      else entries.set(value, row);
    }
    return entries;
  }
  const users = index('User', 'twitchLogin', row => normalize(row.twitchLogin));
  const userIds = index('User', 'id', row => row.id);
  const upmans = index('Upman', 'slug', row => normalize(row.slug));
  const upmanIds = index('Upman', 'id', row => row.id);
  index('Inventory', 'id', row => row.id);
  const owned = index('Inventory', 'userId/upmanId', row => pair(row.userId, row.upmanId));
  const finalOwners = new Map([...upmanIds.keys()].map(id => [id, 0]));
  const firstOwners = data.Upman.map(row => ({ upmanId: row.id, value: row.firstOwner }));
  const historicalFirstOwners = [];
  for (const row of data.Inventory) {
    if (!userIds.has(row.userId) || !upmanIds.has(row.upmanId)) {
      conflicts.push({ type: 'possession orpheline', id: row.id });
      continue;
    }
    if (!timestamp(row.obtainedAt)) conflicts.push({ type: 'date Anniversary invalide', id: row.id });
    finalOwners.set(row.upmanId, finalOwners.get(row.upmanId) + 1);
  }
  for (const row of data.Upman) {
    if (!Object.hasOwn(row, 'firstOwner') || (row.firstOwner !== null && typeof row.firstOwner !== 'string')) {
      conflicts.push({ type: 'firstOwner invalide', upmanId: row.id });
      continue;
    }
    if (row.firstOwner) {
      const user = users.get(normalize(row.firstOwner));
      if (!user || !owned.has(pair(user.id, row.id))) historicalFirstOwners.push({ upmanId: row.id, value: row.firstOwner });
    }
  }
  for (const slug of new Set([...source.mappedSlugs, 'nuttellaupman', 'ezraupman'])) {
    if (!upmans.has(slug)) conflicts.push({ type: 'slug Anniversary manquant', slug });
  }
  const imports = [];
  for (const row of source.users) {
    const existing = users.get(row.twitchLogin);
    if (!existing && row.role === 'USER') imports.push({ ...row, twitchUserId: null });
    else if (!existing) conflicts.push({ type: 'import privilégié interdit', login: row.twitchLogin });
    else if (existing.role !== row.role) preservedRoleDifferences.push({
      login: row.twitchLogin, anniversary: existing.role, production: row.role,
    });
  }
  const additions = [];
  const dates = [];
  const commonIds = new Set();
  let ezraHistoricalPossessions = 0;
  for (const row of source.inventory) {
    const user = users.get(row.login);
    const upman = upmans.get(row.slug);
    if (!upman || row.slug === 'nuttellaupman') {
      conflicts.push({ type: 'mapping de possession non autorisé', login: row.login, slug: row.slug });
      continue;
    }
    if (row.slug === 'ezraupman') ezraHistoricalPossessions++;
    const existing = user ? owned.get(pair(user.id, upman.id)) : undefined;
    if (existing) {
      commonIds.add(existing.id);
      if (timestamp(existing.obtainedAt) !== row.obtainedAt) {
        dates.push({ id: existing.id, before: timestamp(existing.obtainedAt), after: row.obtainedAt });
      }
    } else {
      additions.push({ login: row.login, userId: user?.id ?? null, upmanId: upman.id, obtainedAt: row.obtainedAt });
      finalOwners.set(upman.id, finalOwners.get(upman.id) + 1);
    }
  }
  const retained = data.Inventory.filter(row => !commonIds.has(row.id)).map(row => ({ id: row.id, obtainedAt: row.obtainedAt }));
  const owners = data.Upman.flatMap(row => row.ownersCount === finalOwners.get(row.id) ? [] : [{
    upmanId: row.id, before: row.ownersCount, after: finalOwners.get(row.id),
  }]);
  return { imports, additions, dates, retained, owners, common: commonIds.size, firstOwners,
    historicalFirstOwners, ezraHistoricalPossessions, conflicts, preservedRoleDifferences };
}

function inputHashes() {
  return Object.fromEntries(exportNames.map(name => [
    name, hashBytes(readFileSync(new URL('../upmandex-migration-exports/' + name, import.meta.url))),
  ]));
}

export async function readInputs() {
  const original = await atStage('Empreintes des exports', inputHashes);
  const source = await atStage('Lecture des exports', readProduction);
  if (hash(original) !== hash(inputHashes())) throw Error('Les exports ont changé pendant la lecture.');
  return { original, source };
}

export function planFingerprint({ target, backup, current, saved }, original, plan) {
  return hash({
    version: '4g-c-1', target, backup, snapshot: hash(current), backupSnapshot: hash(saved), exports: original, plan,
  });
}

function delta(values, reference) {
  return Object.fromEntries(Object.keys(reference).filter(key => values[key] !== reference[key])
    .map(key => [key, { current: values[key], reference: reference[key] }]));
}

async function main() {
  if (process.argv.length !== 2) throw Error('Ce script de lecture seule ne prend aucun argument.');
  const reportPath = `upmandex-migration-exports/lot-4g-c-${randomUUID()}.json`;
  const { current, saved, target, backup } = await readVerifiedPair(reportPath);
  const { original, source } = await readInputs();
  const counts = Object.fromEntries(modelTables.map(table => [table, current.data[table].length]));
  const backupDifferences = modelTables.flatMap(table => hash(current.data[table]) === hash(saved.data[table])
    ? [] : [{ table, anniversary: counts[table], backup: saved.data[table].length }]);
  const schemaMatches = hash(current.schema) === hash(saved.schema);
  const plan = await atStage('Calcul du plan de réconciliation', () => reconcile(source, current.data));
  const operations = {
    usersToImport: plan.imports.length, possessionsToAdd: plan.additions.length, common: plan.common,
    datesToUpdate: plan.dates.length, countersToUpdate: plan.owners.length,
    anniversaryOnly: plan.retained.length, historicalFirstOwners: plan.historicalFirstOwners.length,
  };
  const projected = { users: counts.User + operations.usersToImport, upmans: counts.Upman,
    possessions: counts.Inventory + operations.possessionsToAdd };
  const blockers = [];
  if (!schemaMatches) blockers.push('Schéma différent de la sauvegarde.');
  if (backupDifferences.length) blockers.push('Données différentes de la sauvegarde.');
  if (plan.conflicts.length) blockers.push('Conflits dans le plan détaillé.');
  const fingerprint = blockers.length ? null : planFingerprint({ target, backup, current, saved }, original, plan);
  const summary = {
    outcome: blockers.length ? 'blocked' : 'read-only-plan', counts, operations, projected,
    differences4FC: { counts: delta(counts, referenceCounts), operations: delta(operations, referenceOperations) },
    backupMatches: schemaMatches && backupDifferences.length === 0, backupDifferences,
    ezraHistoricalPossessions: plan.ezraHistoricalPossessions, newNuttellaHistoricalPossessions: 0,
    protectedTablesPlannedChanges: 0, firstOwnerPlannedChanges: 0,
    blockers, fingerprint, privateReport: reportPath,
  };
  await atStage('Enregistrement du rapport privé', () => writeFileSync(new URL('../' + reportPath, import.meta.url),
    JSON.stringify({ ...summary, target, backup, exports: original, plan }, null, 2) + '\n',
    { flag: 'wx', mode: 0o600 }));
  console.log(JSON.stringify(summary, null, 2));
  if (blockers.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  atStage('Recalcul en lecture seule', main).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
