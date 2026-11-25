import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { cloneConnectionConfig, runTransaction } from './lot-4f-c-simulation.mjs';

test('pooled clone startup uses the Lot 4F-B settings and verified TLS', () => {
  const url = new URL('postgresql://fixture:fixture@ep-fixture-pooler.neon.tech/neondb?sslmode=require&channel_binding=require');
  const config = cloneConnectionConfig(url);
  const client = new pg.Client(config);
  assert.equal(config.connectionString, undefined);
  assert.equal(client.host, url.hostname);
  assert.deepEqual(client.ssl, { rejectUnauthorized: true, servername: url.hostname });
  assert.equal(client.enableChannelBinding, true);
  const startup = client.getStartupConf();
  assert.equal(startup.options, '-c default_transaction_read_only=on');
  assert.equal(startup.statement_timeout, '15000');
  assert.equal(startup.search_path, undefined);
  assert.equal(startup.lock_timeout, undefined);
});

test('verify checks read-only mode before setting transaction-local options or reading rows', async () => {
  const statements = [];
  const stop = new Error('End of fixture before the first read');
  const client = {
    async query(sql) {
      statements.push(sql);
      if (sql === 'SHOW transaction_read_only') return { rows: [{ transaction_read_only: 'on' }] };
      if (sql.startsWith('SELECT')) throw stop;
      return {};
    },
  };
  await assert.rejects(runTransaction(client, { mode: '--verify' }), error => error === stop);
  assert.deepEqual(statements.slice(0, 3), [
    'BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY',
    'SHOW transaction_read_only',
    'SET LOCAL search_path = pg_catalog',
  ]);
  assert.equal(statements.length, 5);
  assert.match(statements[3], /^SELECT /);
  assert.equal(statements[4], 'ROLLBACK');
});
