import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildPlan, modelTables, runTransaction, validateChanges } from './lot-4f-c-simulation.mjs';

test('snapshot reads each Anniversary table ordered by its actual Prisma primary key', async () => {
  const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
  const primaryKeys = new Map([['_prisma_migrations', ['id']]]);
  for (const [, model, body] of schema.matchAll(/^model (\w+) \{([\s\S]*?)^}/gm)) {
    const composite = /@@id\(\[([^\]]+)\]/.exec(body);
    const scalar = /^\s*(\w+)\s+\w+\s+@id\b/m.exec(body);
    primaryKeys.set(model, composite ? composite[1].split(/,\s*/) : [scalar[1]]);
  }
  const read = [];
  const client = {
    async query(sql) {
      if (sql === 'SHOW transaction_read_only') return { rows: [{ transaction_read_only: 'on' }] };
      if (!sql.startsWith('SELECT')) return {};
      const [, name, order] = /^SELECT to_jsonb\(t\) AS data FROM public\."([^"]+)" AS t ORDER BY (.+)$/.exec(sql);
      assert.deepEqual([...order.matchAll(/t\."([^"]+)"/g)].map(match => match[1]), primaryKeys.get(name));
      read.push(name);
      return { rows: [] };
    },
  };
  await assert.rejects(runTransaction(client, { mode: '--verify' }), /Compteur inattendu/);
  assert.deepEqual(read, modelTables);
});

test('a missing snapshot column reports the table without the raw driver message', async () => {
  const client = {
    async query(sql) {
      if (sql === 'SHOW transaction_read_only') return { rows: [{ transaction_read_only: 'on' }] };
      if (sql.includes('public."PersonArtworkLike"')) {
        throw Object.assign(new Error('PRIVATE_FIXTURE'), { code: '42703' });
      }
      return { rows: [] };
    },
  };
  await assert.rejects(runTransaction(client, { mode: '--verify' }), error => {
    assert.match(error.message, /42703.*snapshot\(\).*"PersonArtworkLike".*"userId", "artworkId"/);
    assert.doesNotMatch(error.message, /PRIVATE_FIXTURE/);
    return true;
  });
});

test('integrity and comparison accept populated compound keys and detect duplicates', () => {
  const data = Object.fromEntries(modelTables.map(name => [name, []]));
  data.User = [{ id: 'u', twitchLogin: 'fixture', createdAt: '2026-01-01T00:00:00Z' }];
  data.Person = [{ id: 'p', userId: 'u', equippedCustomBackgroundId: null, equippedCustomBannerId: null }];
  data.PersonArtwork = [{ id: 'a', personId: 'p' }, { id: 'b', personId: 'p' }];
  data.PersonArtworkLike = [{ userId: 'u', artworkId: 'a' }, { userId: 'u', artworkId: 'b' }];
  data.PullRarityRule = [{ rarity: 'Common' }];
  assert.throws(() => buildPlan({}, data), /Compteur inattendu/);
  validateChanges(data, { ...data, PersonArtworkLike: [...data.PersonArtworkLike].reverse() });
  data.PersonArtworkLike.push(data.PersonArtworkLike[0]);
  assert.throws(() => buildPlan({}, data), /collision/);
});
