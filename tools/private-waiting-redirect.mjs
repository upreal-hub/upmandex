export function assessWaitingRedirect(location, deployment, path) {
  let target;
  try {
    if (typeof location === 'string' && location.trim()) target = new URL(location, new URL(path, deployment));
  } catch { /* Invalid or missing Location fails closed without echoing its contents. */ }
  const sameOrigin = Boolean(target && target.origin === new URL(deployment).origin);
  const passed = sameOrigin && target.pathname === '/waiting' && !target.search && !target.hash
    && !target.username && !target.password;
  return { passed: Boolean(passed), location: target ? target.origin + target.pathname : null,
    locationSameDeployment: sameOrigin, locationHasQuery: Boolean(target?.search), locationHasFragment: Boolean(target?.hash) };
}
