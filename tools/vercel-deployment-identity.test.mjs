import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyDeploymentIdentity } from './vercel-deployment-identity.mjs';

const expected = { projectId: 'prj_R6Hdw8elr07EAAOT50AGsRXnBC5O', projectName: 'upmandex',
  deploymentId: 'dpl_F5KAMPK7SZHV4fn8Hg91s3smyGaV', teamId: 'team_zVE7BEJPJwJLA8h1cnnPL2Kz',
  url: 'https://upmandex-5225zlkgw-upreal-s-projects.vercel.app' };
// Actual CLI 59 printJson fields: id/name/url/target/readyState; no projectId.
const cli = { id: expected.deploymentId, name: 'upmandex', url: expected.url.slice(8), target: 'production', readyState: 'READY' };
const api = { ...cli, projectId: expected.projectId, teamId: expected.teamId };

test('accepts actual CLI 59 output using independent API project identity', () => {
  assert.equal(verifyDeploymentIdentity(cli, api, expected).projectId, expected.projectId);
  assert.equal(verifyDeploymentIdentity(api, undefined, expected).readyState, 'READY');
});
test('accepts equivalent API field names and case without accepting contradictory states', () => {
  const alternate = { ...api, project: { id: api.projectId, name: 'upmandex' }, state: 'Ready' };
  delete alternate.readyState;
  delete alternate.projectId;
  assert.equal(verifyDeploymentIdentity(cli, { deployment: alternate }, expected).readyState, 'READY');
  assert.throws(() => verifyDeploymentIdentity(cli, { ...api, state: 'ERROR' }, expected));
});
test('name-only identification and missing state fail closed', () => {
  assert.throws(() => verifyDeploymentIdentity(cli, undefined, expected));
  const missing = { ...api };
  delete missing.readyState;
  assert.throws(() => verifyDeploymentIdentity(cli, missing, expected));
});
test('rejects wrong project, team, deployment, URL, environment and non-ready states', () => {
  for (const patch of [{ projectId: 'prj_other' }, { teamId: 'team_other' }, { id: 'dpl_other' },
    { url: 'https://upmandex.com' }, { url: expected.url + '/other' }, { target: 'preview' },
    { readyState: 'BUILDING' }, { readyState: 'ERROR' }, { readyState: 'CANCELED' }]) {
    assert.throws(() => verifyDeploymentIdentity(cli, { ...api, ...patch }, expected));
  }
  assert.throws(() => verifyDeploymentIdentity({ ...cli, id: 'dpl_other' }, api, expected));
});
