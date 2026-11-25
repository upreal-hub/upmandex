import assert from 'node:assert/strict';
import test from 'node:test';
import { modelTables } from './lot-4f-c-simulation.mjs';
import { approved } from './lot-4g-d-test.mjs';
import { parseCommand, verifyAnniversaryPair } from './lot-4g-e-anniversary.mjs';

const apply = ['--apply-anniversary', '--approved-plan=' + approved, '--confirm-branch=anniversary'];
const target = { project: 'late-paper-17187204', name: 'anniversary', branchId: 'br-target', endpointId: 'ep-target' };
const backup = { project: target.project, name: 'backup-anniversary-before-migration-2026-11-17',
  branchId: 'br-backup', endpointId: 'ep-backup' };

test('only the exact plan and Anniversary confirmation enable application', () => {
  assert.equal(parseCommand(['--verify']), 'verify');
  assert.equal(parseCommand(apply), 'apply');
  for (const args of [[], apply.slice(0, 2), [...apply, '--verify'],
    [apply[0], apply[1], '--confirm-branch=production'],
    [apply[0], '--approved-plan=' + '0'.repeat(64), apply[2]]]) {
    assert.throws(() => parseCommand(args), /Arguments refusés/);
  }
});

test('refuses non-Anniversary targets and a backup with the same endpoint', () => {
  for (const name of ['production', 'anniversary-reconciliation-4g-d-2026-11-17', backup.name]) {
    assert.throws(() => verifyAnniversaryPair({ target: { ...target, name }, backup }), /Identités/);
  }
  assert.throws(() => verifyAnniversaryPair({ target, backup: { ...backup, endpointId: target.endpointId } }), /Identités/);
});

test('names a changed backup table and rejects an unapproved fingerprint even when both snapshots match', () => {
  const current = { schema: [], data: Object.fromEntries(modelTables.map(name => [name, []])) };
  const saved = structuredClone(current);
  saved.data.PersonAchievement.push({ id: 'PRIVATE_FIXTURE' });
  assert.throws(() => verifyAnniversaryPair({ target, backup, current, saved }), error => {
    assert.match(error.message, /Écart avec la sauvegarde.*PersonAchievement/);
    assert.doesNotMatch(error.message, /PRIVATE_FIXTURE/);
    return true;
  });
  assert.throws(() => verifyAnniversaryPair({ target, backup, current, saved: current }, {},
    { users: [], inventory: [], mappedSlugs: [] }), /Empreinte 4G-C différente/);
});
