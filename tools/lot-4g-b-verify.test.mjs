import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { atStage, loadConfig, checkReferencePlan, matchesWithoutOneAchievement } from './lot-4g-b-verify.mjs';
import { modelTables } from './lot-4f-c-simulation.mjs';

const config = [
  'ANNIVERSARY_BRANCH_ID=br-target',
  'ANNIVERSARY_DATABASE_URL="postgresql://fixture:fixture@ep-target.neon.tech/neondb"',
  'ANNIVERSARY_BACKUP_BRANCH_ID=br-backup',
  'ANNIVERSARY_BACKUP_DATABASE_URL="postgresql://fixture:fixture@ep-backup.neon.tech/neondb"',
].join('\r\n');

test('can isolate one additional achievement without changing the snapshot', () => {
  const rows = Array.from({ length: 42 }, (_, id) => ({ id }));
  const baseline = { data: { User: [{ id: 'original' }], PersonAchievement: rows } };
  const fingerprint = createHash('sha256').update(JSON.stringify(baseline)).digest('hex');
  const current = { data: { ...baseline.data, PersonAchievement: [...rows, { id: 42 }] } };
  assert.equal(matchesWithoutOneAchievement(current, fingerprint), true);
  assert.equal(current.data.PersonAchievement.length, 43);
  assert.equal(matchesWithoutOneAchievement({ data: { ...current.data, User: [] } }, fingerprint), false);
});

test('surfaces a real 4F-C assertion without exposing arbitrary failure details', async () => {
  const data = Object.fromEntries(modelTables.map(table => [table, []]));
  assert.throws(() => checkReferencePlan({}, data), /Compteur inattendu : Upman \(0 lignes lues\)/);
  Object.defineProperty(data, 'Upman', { get() { throw new Error('PRIVATE_FIXTURE'); } });
  await assert.rejects(atStage('Comparaison', () => checkReferencePlan({}, data)),
    { message: 'Comparaison : échec, détails privés masqués.' });
});

test('loads a Windows UTF-8 BOM and identifies a missing variable by name', () => {
  assert.equal(loadConfig('\uFEFF' + config, 'fixture-key').ANNIVERSARY_BRANCH_ID, 'br-target');
  assert.throws(() => loadConfig(config.split('\r\n').slice(0, 3).join('\r\n'), 'fixture-key'),
    /ANNIVERSARY_BACKUP_DATABASE_URL absente/);
  assert.throws(() => loadConfig(config, 'invalid token'), /NEON_API_KEY absente ou mal formée/);
});

test('diagnoses nested DNS, TLS, SQL and unknown errors without exposing raw text', async () => {
  const secret = 'PRIVATE_FIXTURE';
  for (const [error, expected] of [
    [new TypeError(secret, { cause: Object.assign(new Error(secret), { code: 'ENOTFOUND' }) }), /DNS \(ENOTFOUND\)/],
    [Object.assign(new Error(secret), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' }), /TLS/],
    [Object.assign(new Error(secret), { code: '42703', severity: 'ERROR' }), /SQLSTATE 42703/],
    [new Error(secret), /détails privés masqués/],
  ]) {
    await assert.rejects(atStage('Lecture de la sauvegarde', () => { throw error; }), failure => {
      assert.match(failure.message, /^Lecture de la sauvegarde/);
      assert.match(failure.message, expected);
      assert.doesNotMatch(failure.message, /PRIVATE_FIXTURE/);
      return true;
    });
  }
});
