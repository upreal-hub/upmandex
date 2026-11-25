import { VerificationError } from './lot-4g-b-verify.mjs';

export function verifyDeploymentIdentity(inspected, api, expected) {
  const check = (condition, message) => { if (!condition) throw new VerificationError(message); };
  const projectIds = [];
  for (const [label, payload] of [['CLI', inspected], ['API', api]]) {
    if (label === 'API' && payload === undefined) continue;
    const value = payload?.deployment ?? payload;
    check(value && typeof value === 'object', label + ' : métadonnées de déploiement absentes.');
    const ids = [value.id, value.uid].filter(id => id !== undefined && id !== null);
    check(ids.length && ids.every(id => id === expected.deploymentId), label + ' : ID de déploiement incorrect.');
    let url;
    try { url = new URL(value.url?.startsWith('https://') ? value.url : 'https://' + value.url); } catch { /* Refuse below. */ }
    check(url?.origin === expected.url && url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password,
      label + ' : URL du déploiement incorrecte.');
    const states = [value.readyState, value.state, value.status].filter(state => state !== undefined && state !== null);
    check(states.length && states.every(state => typeof state === 'string' && state.trim().toUpperCase() === 'READY'),
      label + ' : état READY non confirmé.');
    check(typeof value.target === 'string' && value.target.toLowerCase() === 'production', label + ' : cible Production non confirmée.');
    for (const id of [value.projectId, value.project?.id]) if (id !== undefined && id !== null) projectIds.push(id);
    for (const name of [value.name, value.project?.name]) if (name !== undefined && name !== null) {
      check(name === expected.projectName, label + ' : nom de projet incohérent.');
    }
    for (const id of [value.teamId, value.team?.id, value.ownerId]) if (id !== undefined && id !== null) {
      check(id === expected.teamId, label + ' : équipe propriétaire incorrecte.');
    }
  }
  check(projectIds.length && projectIds.every(id => id === expected.projectId), 'Identifiant du projet Vercel non confirmé.');
  return { projectId: expected.projectId, deploymentId: expected.deploymentId, readyState: 'READY', target: 'production', url: expected.url };
}
