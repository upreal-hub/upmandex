import assert from 'node:assert/strict';
import test from 'node:test';
import { modelTables } from './lot-4f-c-simulation.mjs';
import { verifyStart } from './lot-4g-d-test.mjs';

test('refuses a backup mismatch before reading or executing a plan', () => {
  assert.throws(() => verifyStart({ current: { schema: [] }, saved: { schema: ['changed'] } }),
    /Anniversary et sa sauvegarde divergent/);
});

test('identical snapshots with an unapproved plan still fail closed', () => {
  const snapshot = { schema: [], data: Object.fromEntries(modelTables.map(name => [name, []])) };
  assert.throws(() => verifyStart({ current: snapshot, saved: structuredClone(snapshot) }, {},
    { users: [], inventory: [], mappedSlugs: [] }), /Empreinte 4G-C différente ou conflit/);
});
