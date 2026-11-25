import { pathToFileURL } from 'node:url';
import { atStage, readVerifiedPair, VerificationError } from './lot-4g-b-verify.mjs';
import { readProduction } from './lot-4f-c-simulation.mjs';

const normalize = value => typeof value === 'string' ? value.trim().toLowerCase() : '';

export function summarizeUsers(current, backup, production) {
  const baselineById = new Map(backup.User.map(row => [row.id, row]));
  const baselineLogins = new Set(backup.User.map(row => normalize(row.twitchLogin)));
  const userIds = new Map(current.User.map(row => [row.id, row]));
  const upmanIds = new Set(current.Upman.map(row => row.id));
  const byLogin = new Map(current.User.map(row => [normalize(row.twitchLogin), row]));
  const imported = production.users.filter(row => !baselineLogins.has(normalize(row.twitchLogin)));
  const matched = imported.map(row => ({
    expected: row, actual: byLogin.get(normalize(row.twitchLogin)),
  })).filter(({ actual }) => actual && !baselineById.has(actual.id));
  const uniquePossessions = new Set(current.Inventory.map(row => JSON.stringify([row.userId, row.upmanId])));
  const orphanedPossessions = current.Inventory.filter(row => !userIds.has(row.userId) || !upmanIds.has(row.upmanId)).length;
  const changedExistingRoles = backup.User.filter(row => userIds.has(row.id) && userIds.get(row.id).role !== row.role).length;
  const changedImportedRoles = matched.filter(({ actual, expected }) => actual.role !== expected.role).length;
  const unlinkedImported = matched.filter(({ actual }) => actual.twitchUserId === null);
  const linkedTwitchIds = current.User.filter(row => row.twitchUserId !== null).map(row => row.twitchUserId);
  const anomalies = {
    duplicateNormalizedLogins: current.User.length - byLogin.size,
    malformedLogins: current.User.filter(row => !/^[a-z0-9_]{1,25}$/.test(normalize(row.twitchLogin))).length,
    duplicateTwitchIds: linkedTwitchIds.length - new Set(linkedTwitchIds).size,
    malformedTwitchIds: linkedTwitchIds.filter(id => !/^[1-9][0-9]{0,29}$/.test(id ?? '')).length,
    duplicatePossessions: current.Inventory.length - uniquePossessions.size,
    orphanedPossessions,
    missingExistingUsers: backup.User.filter(row => !userIds.has(row.id)).length,
    changedExistingRoles,
    changedImportedRoles,
    unmatchedExpectedImports: imported.length - matched.length,
  };
  return {
    users: current.User.length, upmans: current.Upman.length, possessions: current.Inventory.length,
    expectedImports: imported.length, matchedImports: matched.length,
    twitchIdsStillNull: current.User.length - linkedTwitchIds.length,
    importedTwitchIdsStillNull: unlinkedImported.length,
    importedUnlinkedRegularUsers: unlinkedImported.filter(({ actual }) =>
      actual.role === 'USER' && /^[a-z0-9_]{1,25}$/.test(normalize(actual.twitchLogin))).length,
    unlinkedAdmins: current.User.filter(row => row.role === 'ADMIN' && row.twitchUserId === null).length,
    anomalies,
  };
}

async function main() {
  if (process.argv.length !== 2) throw new VerificationError('Ce contrôle en lecture seule ne prend aucun argument.');
  const { current, saved } = await readVerifiedPair();
  const summary = summarizeUsers(current.data, saved.data, readProduction());
  console.log(JSON.stringify(summary, null, 2));
  if (summary.users !== 80 || summary.possessions !== 482 || summary.expectedImports !== 26
    || Object.values(summary.anomalies).some(Boolean)) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  atStage('Contrôle des utilisateurs Anniversary', main).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
