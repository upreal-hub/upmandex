import assert from 'node:assert/strict';
import test from 'node:test';
import { executeMewSteps, validateMewRows } from './secure-mew-private.mjs';

function fixture(failure) {
  const calls = [];
  const action = name => async () => { calls.push(name); if (name === failure) throw Error('fixture failure'); return []; };
  return { calls, actions: Object.fromEntries(['copyAndVerify', 'replaceReferences', 'verifyAccess', 'lockAndValidateDeletion',
    'deleteOriginals', 'verifyRevocation', 'restoreReferences', 'releaseLocks'].map(name => [name, action(name)])) };
}
test('all verification gates precede the two authorized deletions', async () => {
  const f = fixture();
  await executeMewSteps(f.actions);
  assert.deepEqual(f.calls, ['copyAndVerify', 'replaceReferences', 'verifyAccess', 'lockAndValidateDeletion', 'deleteOriginals', 'verifyRevocation', 'releaseLocks']);
});
test('copy or SQL failure never reaches deletion', async () => {
  for (const failure of ['copyAndVerify', 'replaceReferences']) {
    const f = fixture(failure);
    await assert.rejects(executeMewSteps(f.actions));
    assert.equal(f.calls.includes('deleteOriginals'), false);
  }
});
test('failed authenticated access or a last-minute reference conflict restores references without deleting', async () => {
  for (const failure of ['verifyAccess', 'lockAndValidateDeletion']) {
    const f = fixture(failure);
    await assert.rejects(executeMewSteps(f.actions));
    assert.equal(f.calls.includes('deleteOriginals'), false);
    assert.equal(f.calls.includes('restoreReferences'), true);
    assert.equal(f.calls.at(-1), 'releaseLocks');
  }
});
test('a deletion failure is not retried and never restores links to possibly deleted originals', async () => {
  const f = fixture('deleteOriginals');
  await assert.rejects(executeMewSteps(f.actions));
  assert.equal(f.calls.filter(name => name === 'deleteOriginals').length, 1);
  assert.equal(f.calls.includes('restoreReferences'), false);
});
test('exact two IDs, non-approved status and original URLs are mandatory', () => {
  const ids = ['cmvjhhfll000008i1m8vp5zz8', 'cmvjhi0t9000308i14kb6793j'];
  const rows = ids.map((id, n) => ({ id, name: 'MEW', status: 'PENDING', approvedUpmanId: null,
    image: 'https://e4pburhj5wrv8agh.public.blob.vercel-storage.com/upman-submissions/fixture-' + n + '.png' }));
  const plan = { targets: rows.map(row => ({ submissionId: row.id, originalPublicUrl: row.image })) };
  assert.doesNotThrow(() => validateMewRows(rows, plan));
  for (const patch of [{ status: 'APPROVED' }, { name: 'Other' }, { image: 'https://evil.example/file.png' }, { id: 'other' }]) {
    assert.throws(() => validateMewRows([{ ...rows[0], ...patch }, rows[1]], plan));
  }
});
