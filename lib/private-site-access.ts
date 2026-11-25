export function isPrivateSiteEnabled() {
  return process.env.VERCEL === "1" || process.env.UPMANDEX_ENV === "anniversary" || process.env.UPMANDEX_PRIVATE_ACCESS === "1";
}

export function isPrivateSiteMember(twitchUserId: unknown, members = process.env.UPMANDEX_PRIVATE_TWITCH_IDS) {
  return typeof twitchUserId === "string" && /^\d+$/.test(twitchUserId)
    && (members ?? "").split(",").some((id) => id.trim() === twitchUserId);
}

const authPaths = new Set([
  "GET /api/auth/signin", "POST /api/auth/signin/twitch", "GET /api/auth/callback/twitch",
  "GET /api/auth/error", "GET /api/auth/session", "GET /api/auth/csrf",
  "GET /api/auth/providers", "GET /api/auth/signout", "POST /api/auth/signout",
]);

const integrationPaths = new Set([
  "/api/event-redeems", "/api/pulls", "/api/reward-upman", "/api/stream-card",
  "/api/stream-commands", "/api/stream-context", "/api/stream-profile",
  "/api/twitch-achievement-events",
]);

export function isPrivateSiteAuthPath(method: string, path: string) {
  return authPaths.has(`${method} ${path}`);
}

export function isPrivateSiteIntegrationPath(method: string, path: string) {
  return (method === "POST" && integrationPaths.has(path))
    || (method === "GET" && path === "/api/reward-upman");
}
