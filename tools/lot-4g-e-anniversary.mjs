import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { modelTables } from './lot-4f-c-simulation.mjs';
import { atStage, identify, readBranch, readVerifiedPair, VerificationError } from './lot-4g-b-verify.mjs';
import { planFingerprint, readInputs, reconcile } from './lot-4g-c-plan.mjs';
import { approved, runVerifiedTransaction, verifyFinal, verifyStart } from './lot-4g-d-test.mjs';

const project = 'late-paper-17187204';
const branchName = 'anniversary';
const backupName = 'backup-anniversary-before-migration-2026-11-17';
const validatedTest = '13941a80d9ad22ea349c654299098ca30543a87392cca95b243694d4a0c97a0e';

export function parseCommand(args) {
  if (isDeepStrictEqual(args, ['--verify'])) return 'verify';
  if (isDeepStrictEqual(args, ['--apply-anniversary', '--approved-plan=' + approved, '--confirm-branch=anniversary'])) {
    return 'apply';
  }
  throw new VerificationError('Arguments refusés. Utiliser --verify ou la commande d’application explicitement autorisée.');
}

export function verifyAnniversaryPair(pair, original, source) {
  const { target, backup, current, saved } = pair;
  if (target.project !== project || target.name !== branchName || backup.name !== backupName
    || backup.project !== project || target.branchId === backup.branchId || target.endpointId === backup.endpointId) {
    throw new VerificationError('Identités Anniversary ou sauvegarde inattendues.');
  }
  const differences = modelTables.flatMap(table => isDeepStrictEqual(current.data[table], saved.data[table])
    ? [] : [{ table, anniversary: current.data[table].length, backup: saved.data[table].length }]);
  const schemaMatches = isDeepStrictEqual(current.schema, saved.schema);
  if (!schemaMatches || differences.length) {
    throw new VerificationError('Écart avec la sauvegarde, aucune écriture : ' + JSON.stringify({ schemaMatches, differences }));
  }
  const plan = reconcile(source, current.data);
  if (planFingerprint(pair, original, plan) !== approved) {
    const operations = { users: plan.imports.length, possessions: plan.additions.length, dates: plan.dates.length,
      counters: plan.owners.length, achievements: current.data.PersonAchievement.length, conflicts: plan.conflicts.length };
    throw new VerificationError('Empreinte 4G-C différente, aucune écriture. Plan actuel : ' + JSON.stringify(operations));
  }
  return verifyStart(pair, original, source);
}

async function identifyTarget(pair) {
  const target = await identify(branchName, pair.target.branchId, pair.targetUrl.href, pair.token);
  if (target.endpointId !== pair.target.endpointId || target.url.hostname !== pair.target.hostname
    || target.endpointId === pair.backup.endpointId) {
    throw new VerificationError('Endpoint Anniversary différent de celui du plan approuvé.');
  }
  return target;
}

async function main() {
  const mode = parseCommand(process.argv.slice(2));
  const reportPath = `upmandex-migration-exports/lot-4g-e-${randomUUID()}.json`;
  const pair = await readVerifiedPair(mode === 'apply' ? reportPath : undefined);
  const { original, source } = await readInputs();
  const plan = await atStage('Contrôle du plan 4G-C', () => verifyAnniversaryPair(pair, original, source));
  const target = await identifyTarget(pair);
  if (mode === 'verify') {
    console.log(JSON.stringify({ outcome: 'verified-before-application', target: branchName,
      backup: backupName, approvedPlan: approved, validatedTest,
      usersToImport: 26, possessionsToAdd: 140, datesToCorrect: 21, countsToCorrect: 30, achievements: 43 }, null, 2));
    return;
  }

  const applied = await atStage('Transaction Anniversary', () =>
    runVerifiedTransaction(target, pair, original, source, plan, report => {
      writeFileSync(new URL('../' + reportPath, import.meta.url),
        JSON.stringify({ ...report, backup: backupName, validatedTest }, null, 2) + '\n',
        { flag: 'wx', mode: 0o600 });
    }));

  await atStage('Lecture après COMMIT', async () => {
    const verified = await identifyTarget(pair);
    const final = await readBranch(verified.url, branchName);
    if (!isDeepStrictEqual(final, applied.snapshot)) {
      throw new VerificationError('La lecture après COMMIT diverge de l’état validé. Vérifier l’état actuel en lecture seule.');
    }
    verifyFinal(source, final.data);
  });
  console.log(JSON.stringify({ outcome: 'committed-and-verified', target: branchName, approvedPlan: approved,
    users: 80, upmans: 44, possessions: 482, achievements: 43, historicalFirstOwnersPreserved: 5,
    remainingOperations: 0, privateReport: reportPath }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  atStage('Migration Anniversary 4G-E', main).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
