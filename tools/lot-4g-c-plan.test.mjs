import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcile } from './lot-4g-c-plan.mjs';

function fixture() {
  const before = '2026-11-12T10:00:00.000Z';
  const after = '2026-11-13T10:00:00.000Z';
  return {
    source: {
      users: [{ twitchLogin: 'viewer', role: 'USER' }, { twitchLogin: 'imported', role: 'USER' }],
      mappedSlugs: ['ezraupman'],
      inventory: [{ login: 'viewer', slug: 'ezraupman', obtainedAt: after },
        { login: 'imported', slug: 'ezraupman', obtainedAt: after }],
    },
    data: {
      User: [{ id: 'u', twitchLogin: 'Viewer', role: 'ADMIN' }],
      Upman: [{ id: 'e', slug: 'ezraupman', firstOwner: 'historical', ownersCount: 1 },
        { id: 'n', slug: 'nuttellaupman', firstOwner: 'Viewer', ownersCount: 1 }],
      Inventory: [{ id: 'common', userId: 'u', upmanId: 'e', obtainedAt: before },
        { id: 'exclusive', userId: 'u', upmanId: 'n', obtainedAt: before }],
      PersonAchievement: Array.from({ length: 43 }, (_, id) => ({ id })),
    },
  };
}

test('plans against current counts, preserves achievements and firstOwner, and sends historic additions to Ezra', () => {
  const { source, data } = fixture();
  const unchanged = structuredClone(data);
  const plan = reconcile(source, data);
  assert.deepEqual(plan.conflicts, []);
  assert.deepEqual(plan.imports.map(row => row.twitchUserId), [null]);
  assert.deepEqual(plan.additions.map(row => row.upmanId), ['e']);
  assert.deepEqual(plan.dates.map(row => row.id), ['common']);
  assert.deepEqual(plan.retained.map(row => row.id), ['exclusive']);
  assert.deepEqual(plan.owners, [{ upmanId: 'e', before: 1, after: 2 }]);
  assert.deepEqual(plan.historicalFirstOwners, [{ upmanId: 'e', value: 'historical' }]);
  assert.equal(plan.preservedRoleDifferences[0].anniversary, 'ADMIN');
  assert.deepEqual(data, unchanged);
});

test('flags normalized duplicates, orphaned possessions and prohibited mappings', () => {
  const { source, data } = fixture();
  data.User.push({ id: 'duplicate', twitchLogin: ' viewer ' });
  data.Inventory[0].userId = 'missing';
  source.inventory[0].slug = 'nuttellaupman';
  source.users[1].role = 'ADMIN';
  const types = reconcile(source, data).conflicts.map(conflict => conflict.type);
  for (const type of ['clé absente ou dupliquée', 'possession orpheline',
    'mapping de possession non autorisé', 'import privilégié interdit']) assert.ok(types.includes(type));
});
