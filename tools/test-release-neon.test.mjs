import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyClone, verifyMigrationHistory } from './test-release-neon.mjs';

const target = { branch: { id: 'br-real' }, endpointId: 'ep-real' };
const backup = { branch: { id: 'br-backup' }, endpointId: 'ep-backup' };
const branch = { id: 'br-test', name: 'anniversary-reconciliation-4g-d-2026-11-17', parent_id: 'br-backup' };
const endpoint = { id: 'ep-test', host: 'ep-test.region.neon.tech', branch_id: 'br-test', type: 'read_write' };

test('runner refuses the real branch, backup, wrong parent and wrong endpoint', () => {
  assert.doesNotThrow(() => verifyClone(branch, endpoint, target, backup));
  for (const value of [{ ...branch, id: 'br-real' }, { ...branch, id: 'br-backup' },
    { ...branch, name: 'production' }, { ...branch, parent_id: 'br-real' }]) {
    assert.throws(() => verifyClone(value, endpoint, target, backup));
  }
  assert.throws(() => verifyClone(branch, { ...endpoint, branch_id: 'br-real' }, target, backup));
  assert.throws(() => verifyClone(branch, { ...endpoint, type: 'read_only' }, target, backup));
});
test('only the publication migration can be pending', () => {
  const publication = '20261117193000_anniversary_publication';
  const local = new Map([['baseline', 'verified'], [publication, 'publication-checksum']]);
  const row = { migration_name: 'baseline', checksum: 'verified', finished_at: new Date(), rolled_back_at: null };
  assert.equal(verifyMigrationHistory([row], local), false);
  assert.equal(verifyMigrationHistory([row, { ...row, migration_name: publication, checksum: 'publication-checksum' }], local), true);
  assert.throws(() => verifyMigrationHistory([], local));
  assert.throws(() => verifyMigrationHistory([{ ...row, checksum: 'changed' }], local));
  assert.throws(() => verifyMigrationHistory([{ ...row, finished_at: null }], local));
  assert.throws(() => verifyMigrationHistory([row, row], local));
});
