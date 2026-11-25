import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import pg from 'pg';
import { identify } from './lot-4g-b-verify.mjs';
import { cloneConnectionConfig } from './lot-4f-c-simulation.mjs';

const result = {
  targetVerified: false,
  expectedBranch: 'anniversary',
  publicationState: 'inconnu',
  deploymentAllowed: false,
};

let client;
let diagnostic = 'DATABASE_URL Production indisponible dans le processus.';
try {
  if (!process.env.DATABASE_URL) throw new Error();
  diagnostic = 'Le processus ne confirme pas le runtime Production du projet UPMANDEX.';
  if (process.env.VERCEL_ENV !== 'production' ||
      process.env.VERCEL_PROJECT_ID !== 'prj_R6Hdw8elr07EAAOT50AGsRXnBC5O') throw new Error();

  diagnostic = 'La référence Neon Anniversary ou son accès en lecture est indisponible.';
  const branchId = process.env.ANNIVERSARY_BRANCH_ID;
  const token = process.env.NEON_API_KEY;
  const reference = branchId && token ? {} : parseEnv(readFileSync(
    new URL('../upmandex-migration-exports/anniversary-migration.env', import.meta.url), 'utf8',
  ));
  if (!(branchId || reference.ANNIVERSARY_BRANCH_ID) || !(token || reference.NEON_API_KEY)) throw new Error();
  diagnostic = 'Neon ne confirme pas que le point de connexion Production appartient à Anniversary.';
  const target = await identify(
    result.expectedBranch, branchId || reference.ANNIVERSARY_BRANCH_ID,
    process.env.DATABASE_URL, token || reference.NEON_API_KEY,
  );
  result.targetVerified = true;

  diagnostic = 'L’état PRIVATE n’a pas pu être confirmé en lecture seule.';
  client = new pg.Client(cloneConnectionConfig(target.url));
  await client.connect();
  await client.query('BEGIN READ ONLY');
  if ((await client.query('SHOW transaction_read_only')).rows[0]?.transaction_read_only !== 'on') throw new Error();
  const { rows } = await client.query('SELECT status FROM public."SitePublication" WHERE id = $1', ['anniversary']);
  await client.query('ROLLBACK');
  if (rows[0]?.status !== 'PRIVATE') throw new Error();

  result.publicationState = 'PRIVATE';
  result.deploymentAllowed = true;
} catch {
  result.diagnostic = diagnostic;
  process.exitCode = 1;
} finally {
  await client?.end().catch(() => {});
}

console.log(JSON.stringify(result));
