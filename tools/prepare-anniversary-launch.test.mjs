import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectLaunchData, readComparableSnapshot, snapshotDifferences } from './prepare-anniversary-launch.mjs';
import { readSnapshot } from './lot-4g-b-verify.mjs';

test('launch preflight requires the linked owner and retains public media for explicit review', () => {
  const data = { User: Array.from({ length: 80 }, (_, n) => ({ id: n })), Upman: Array(44).fill({}), Inventory: Array(482).fill({}), PersonAchievement: Array(43).fill({}),
    UpmanSubmission: [{ id: 'fixture', image: 'https://fixture.public.blob.vercel-storage.com/upman-submissions/a.png' }] };
  data.User[0] = { id: 0, twitchLogin: 'upreal_', role: 'ADMIN', twitchUserId: '111' };
  assert.equal(inspectLaunchData(data).ownerId, '111');
  assert.equal(inspectLaunchData(data).media.length, 1);
  data.User[0].twitchUserId = null;
  assert.throws(() => inspectLaunchData(data));
  data.User[0].twitchUserId = '111';
  data.User[0].role = 'USER';
  assert.throws(() => inspectLaunchData(data));
});

test('installation reads use the same search_path as the approved preflight', async () => {
  function connection(initialPath) {
    let path = initialPath;
    const statements = [];
    return { statements, query: async sql => {
      statements.push(sql);
      if (sql === 'SET LOCAL search_path = pg_catalog') { path = 'pg_catalog'; return { rows: [] }; }
      if (sql.includes('FROM information_schema.columns')) return { rows: [{ kind: 'constraint', object: 'Inventory',
        name: 'Inventory_userId_fkey', definition: ['FOREIGN KEY ("userId") REFERENCES ' + (path === 'pg_catalog' ? 'public.' : '') + '"User"(id)'] }] };
      return { rows: [{ data: { id: 'fixture', value: 'unchanged' } }] };
    } };
  }
  const preflight = connection('pg_catalog');
  const approved = await readSnapshot((_, sql) => preflight.query(sql));
  const oldInstall = connection('public');
  const old = await readSnapshot((_, sql) => oldInstall.query(sql));
  const originalDifference = snapshotDifferences(approved, old);
  assert.equal(originalDifference.dataEqual, true);
  assert.equal(originalDifference.schemaEqual, false);
  assert.equal(originalDifference.changedSchemaObjects[0].name, 'Inventory_userId_fkey');
  const fixedInstall = connection('public');
  const fixed = await readComparableSnapshot(fixedInstall);
  assert.equal(fixedInstall.statements[0], 'SET LOCAL search_path = pg_catalog');
  assert.deepEqual(fixed, approved);
  assert.ok(fixedInstall.statements.every(sql => sql.startsWith('SET LOCAL') || sql.trimStart().startsWith('SELECT')));
});

test('normalizing session context does not hide actual data or schema changes', () => {
  const before = { data: { User: [{ id: 'fixture', role: 'USER' }] }, schema: [] };
  const after = { data: { User: [{ id: 'fixture', role: 'ADMIN' }] }, schema: [] };
  const difference = snapshotDifferences(before, after);
  assert.equal(difference.dataEqual, false);
  assert.deepEqual(difference.changedTables, [{ table: 'User', beforeCount: 1, afterCount: 1 }]);
  assert.equal(JSON.stringify(difference).includes('fixture'), false);
});
