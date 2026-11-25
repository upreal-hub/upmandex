import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { atStage, loadConfig, neonGet, VerificationError } from './lot-4g-b-verify.mjs';

const testName = 'anniversary-admin-preview-test-2026-11-17';

await atStage('Contrôle Neon Preview', async () => {
  const [branchId, host, extra] = process.argv.slice(2);
  if (extra || !/^br-[a-z0-9-]+$/.test(branchId ?? '')
    || !/^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)*\.neon\.tech$/.test(host ?? '')) {
    throw new VerificationError('Saisir l’identifiant de branche et l’hôte Neon du test.');
  }
  const config = loadConfig(readFileSync(new URL('../upmandex-migration-exports/anniversary-migration.env',
    import.meta.url), 'utf8'), process.env.NEON_API_KEY);
  if (![config.ANNIVERSARY_BRANCH_ID, config.ANNIVERSARY_BACKUP_BRANCH_ID]
    .every(id => /^br-[a-z0-9-]+$/.test(id))
    || [config.ANNIVERSARY_BRANCH_ID, config.ANNIVERSARY_BACKUP_BRANCH_ID].includes(branchId)) {
    throw new VerificationError('L’identifiant de test doit être distinct d’Anniversary et de sa sauvegarde.');
  }
  const direct = host.replace(/^([^.]+?)-pooler\./, '$1.');
  const endpointId = direct.split('.')[0];
  const token = config.NEON_API_KEY;
  const [{ branch }, { branch: parent }, { endpoint }] = await Promise.all([
    neonGet('/branches/' + branchId, token, 'branche de test'),
    neonGet('/branches/' + config.ANNIVERSARY_BRANCH_ID, token, 'parent Anniversary'),
    neonGet('/endpoints/' + endpointId, token, 'compute de test'),
  ]);
  if (branch?.id !== branchId || branch.name !== testName
    || parent?.id !== config.ANNIVERSARY_BRANCH_ID || parent.name !== 'anniversary'
    || branch.parent_id !== parent.id || endpoint?.id !== endpointId
    || endpoint.host !== direct || endpoint.branch_id !== branchId || endpoint.type !== 'read_write') {
    throw new VerificationError('Les métadonnées Neon ne confirment pas le clone de test attendu.');
  }
  console.log('Branche et endpoint Neon de test vérifiés. Aucune connexion PostgreSQL.');
}).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
