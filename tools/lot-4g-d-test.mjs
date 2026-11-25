import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import pg from 'pg';
import { atStage, identify, neonGet, readBranch, readSnapshot, readVerifiedPair,
  VerificationError } from './lot-4g-b-verify.mjs';
import { planFingerprint, readInputs, reconcile } from './lot-4g-c-plan.mjs';
import { applyPlan, checkIntegrity, cloneConnectionConfig, lockAuditedTables, validateChanges } from './lot-4f-c-simulation.mjs';

const cloneName = 'anniversary-reconciliation-4g-d-2026-11-17';
const project = 'late-paper-17187204';
export const approved = '01463494e9650464e6885531f028a0edb1642a791dad3749940584b308b96258';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

const requireTest = (condition, message) => { if (!condition) throw new VerificationError(message); };
const branchIdValid = value => /^br-[a-z0-9-]+$/.test(value ?? '');
const endpointIdValid = value => /^ep-[a-z0-9-]+$/.test(value ?? '');

export function verifyFinal(source, data) {
  checkIntegrity(data);
  const remaining = reconcile(source, data);
  requireTest(!remaining.conflicts.length && !remaining.imports.length && !remaining.additions.length
    && !remaining.dates.length && !remaining.owners.length && remaining.common === 467
    && remaining.retained.length === 15, 'Le plan recalculé après simulation contient des opérations ou conflits.');
  const counts = [data.User.length, data.Upman.length, data.Inventory.length, data.PersonAchievement.length];
  requireTest(isDeepStrictEqual(counts, [80, 44, 482, 43]), 'Les compteurs finaux divergent de la projection approuvée.');
}

export function verifyStart(pair, original, source) {
  requireTest(isDeepStrictEqual(pair.current, pair.saved), 'Anniversary et sa sauvegarde divergent.');
  checkIntegrity(pair.current.data);
  const plan = reconcile(source, pair.current.data);
  requireTest(!plan.conflicts.length && planFingerprint(pair, original, plan) === approved,
    'Empreinte 4G-C différente ou conflit : arrêt avant création ou écriture.');
  const counts = [pair.current.data.User.length, pair.current.data.Upman.length,
    pair.current.data.Inventory.length, pair.current.data.PersonAchievement.length];
  const operations = [plan.imports.length, plan.additions.length, plan.common, plan.dates.length,
    plan.owners.length, plan.retained.length, plan.historicalFirstOwners.length];
  requireTest(isDeepStrictEqual(counts, [54, 44, 342, 43])
    && isDeepStrictEqual(operations, [26, 140, 327, 21, 30, 15, 5]), 'Volumes initiaux inattendus.');
  return plan;
}

async function createClone(pair) {
  const list = await neonGet('/branches?search=' + cloneName, pair.token, 'absence de collision');
  requireTest(Array.isArray(list.branches) && !list.pagination?.cursor
    && !list.branches.some(branch => branch.name === cloneName), 'Nom indisponible ou liste des branches incomplète.');
  const result = await atStage('Création du clone de test dans Neon', async () => {
    const response = await fetch(`https://console.neon.tech/api/v2/projects/${project}/branches`, {
      method: 'POST', headers: { Authorization: `Bearer ${pair.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch: { name: cloneName, parent_id: pair.backup.branchId },
        endpoints: [{ type: 'read_write' }] }),
      redirect: 'error', signal: AbortSignal.timeout(20_000),
    });
    if (response.status === 401 || response.status === 403) {
      return { denied: true };
    }
    if (!response.ok) return { status: response.status };
    return response.json();
  });
  requireTest(!result.denied, 'Création API refusée : créer manuellement le clone du nom prévu depuis la sauvegarde, avec un compute read_write, puis relancer avec --existing-clone=<ID>.');
  requireTest(!result.status, `Création Neon refusée (HTTP ${result.status}). Vérifier la console avant toute relance.`);
  const branch = result.branch;
  requireTest(branchIdValid(branch?.id) && branch.name === cloneName && branch.parent_id === pair.backup.branchId,
    'Identité du clone créé inattendue.');
  for (const operation of result.operations ?? []) {
    requireTest(/^[0-9a-f-]{36}$/i.test(operation.id), 'Identifiant d’opération Neon inattendu.');
    let status = operation.status;
    for (let attempt = 0; status !== 'finished' && attempt < 30; attempt++) {
      requireTest(['running', 'scheduling'].includes(status), 'Une opération de création Neon a échoué.');
      await delay(2000);
      const latest = await neonGet('/operations/' + operation.id, pair.token, 'attente du clone');
      status = latest.operation?.status;
    }
    requireTest(status === 'finished', 'Création Neon encore en cours. Vérifier la console avant toute relance.');
  }
  return branch.id;
}

async function identifyTestClone(pair, id) {
  requireTest(branchIdValid(id) && ![pair.target.branchId, pair.backup.branchId].includes(id),
    'Identifiant interdit pour le clone de test.');
  const { endpoints } = await neonGet('/branches/' + id + '/endpoints', pair.token, 'compute du clone');
  const writable = endpoints?.filter(endpoint => endpoint.type === 'read_write');
  requireTest(writable?.length === 1, 'Le clone doit posséder un seul compute read_write.');
  const endpoint = writable[0];
  requireTest(endpointIdValid(endpoint.id) && endpoint.branch_id === id
    && ![pair.target.endpointId, pair.backup.endpointId].includes(endpoint.id)
    && typeof endpoint.host === 'string' && endpoint.host.split('.')[0] === endpoint.id
    && /^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)*\.neon\.tech$/.test(endpoint.host), 'Compute du clone non conforme.');
  // The test branch inherits the database and role from the backup.
  const connection = new URL(pair.backupUrl);
  connection.hostname = endpoint.host;
  const verified = await identify(cloneName, id, connection.href, pair.token);
  requireTest(verified.branch.parent_id === pair.backup.branchId && verified.endpointId === endpoint.id,
    'La branche de test ne descend pas de la sauvegarde autorisée.');
  return verified;
}

export async function runVerifiedTransaction(clone, pair, original, source, plan, writeReport) {
  const client = new pg.Client(cloneConnectionConfig(clone.url));
  let commitSent = false;
  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE');
    const { rows } = await client.query('SHOW transaction_read_only');
    requireTest(rows[0]?.transaction_read_only === 'off', 'Mode transactionnel inattendu sur le clone.');
    await client.query('SET LOCAL search_path = pg_catalog');
    await lockAuditedTables(client);
    const before = await readSnapshot((_, sql) => client.query(sql));
    requireTest(isDeepStrictEqual(before, pair.saved), 'La cible diverge de la sauvegarde sous verrou.');
    const recomputed = reconcile(source, before.data);
    requireTest(isDeepStrictEqual(recomputed, plan), 'Le plan recalculé sur la cible diverge du plan approuvé.');
    checkIntegrity(before.data);
    const cloneFingerprint = hash({ approval: approved, branchId: clone.branch.id, endpointId: clone.endpointId,
      hostname: clone.url.hostname, snapshot: hash(before), exports: original, plan: recomputed });
    const expected = await applyPlan(client, before.data, {
      ...recomputed,
      owners: recomputed.owners.map(row => ({ ...row, id: row.upmanId })),
      userIds: new Map(before.data.User.map(row => [row.twitchLogin.trim().toLowerCase(), row.id])),
    });
    await client.query('SET CONSTRAINTS ALL IMMEDIATE');
    const after = await readSnapshot((_, sql) => client.query(sql));
    requireTest(isDeepStrictEqual(before.schema, after.schema), 'Schéma modifié dans la transaction de test.');
    validateChanges(expected, after.data);
    verifyFinal(source, after.data);
    writeReport({ approval: approved, cloneFingerprint, target: clone.branch.name, outcome: 'validated-before-commit',
      finalSnapshotHash: hash(after), operations: { users: 26, possessions: 140, dates: 21, counters: 30 } });
    commitSent = true;
    const result = await client.query('COMMIT');
    requireTest(result.command === 'COMMIT', 'Validation PostgreSQL non confirmée. Vérifier le clone en lecture seule.');
    return { cloneFingerprint, snapshot: after };
  } catch (error) {
    if (!commitSent) await client.query('ROLLBACK').catch(() => {});
    if (commitSent) throw new VerificationError('Résultat du COMMIT incertain. Vérifier la cible en lecture seule avant toute relance.');
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const [confirmation, existing, extra] = process.argv.slice(2);
  requireTest(confirmation === '--approved-plan=' + approved && !extra
    && (!existing || /^--existing-clone=br-[a-z0-9-]+$/.test(existing)), 'Empreinte approuvée requise et arguments strictement contrôlés.');
  const reportPath = 'upmandex-migration-exports/lot-4g-d-' + Date.now() + '.json';
  const pair = await readVerifiedPair(reportPath);
  const { original, source } = await readInputs();
  const plan = verifyStart(pair, original, source);
  const id = existing ? existing.slice('--existing-clone='.length) : await createClone(pair);
  const result = await atStage('Transaction du clone de test', async () => {
    const clone = await identifyTestClone(pair, id);
    const applied = await runVerifiedTransaction(clone, pair, original, source, plan, report => {
      writeFileSync(new URL('../' + reportPath, import.meta.url), JSON.stringify(report, null, 2) + '\n',
        { flag: 'wx', mode: 0o600 });
    });
    return { clone, applied };
  });
  const verifiedAfterCommit = await identifyTestClone(pair, id);
  requireTest(verifiedAfterCommit.endpointId === result.clone.endpointId, 'Endpoint du clone modifié après COMMIT.');
  const final = await readBranch(verifiedAfterCommit.url, cloneName);
  requireTest(isDeepStrictEqual(result.applied.snapshot, final), 'La lecture après COMMIT diffère de l’état validé.');
  verifyFinal(source, final.data);
  console.log(JSON.stringify({ outcome: 'committed-and-verified', clone: cloneName,
    fingerprint: result.applied.cloneFingerprint, users: 80, upmans: 44, possessions: 482, achievements: 43,
    historicalFirstOwnersPreserved: 5, remainingOperations: 0, privateReport: reportPath }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Test errors are deliberately phrased without raw connection, SQL or data details.
  atStage('Simulation 4G-D', main).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
