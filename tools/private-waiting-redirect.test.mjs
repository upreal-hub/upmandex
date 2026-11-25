import assert from 'node:assert/strict';
import test from 'node:test';
import { assessWaitingRedirect } from './private-waiting-redirect.mjs';

const deployment = 'https://upmandex-5225zlkgw-upreal-s-projects.vercel.app';
test('accepts equivalent relative and absolute waiting redirects on the same deployment', () => {
  for (const location of ['/waiting', 'waiting', deployment + '/waiting', '  /waiting  ']) {
    for (const path of ['/admin', '/my-collection']) {
      const result = assessWaitingRedirect(location, deployment, path);
      assert.equal(result.passed, true);
      assert.equal(result.location, deployment + '/waiting');
    }
  }
});
test('rejects old domain, external hosts, private destinations, query parameters and missing headers', () => {
  for (const location of ['https://upmandex.com/waiting', '//evil.example/waiting', '/admin',
    '/waiting?redirect=/admin', '/waiting#fragment', undefined, '', 'https://user:password@' + deployment.slice(8) + '/waiting']) {
    assert.equal(assessWaitingRedirect(location, deployment, '/admin').passed, false);
  }
});
