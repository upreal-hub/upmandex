import "server-only";

type ActiveTwitchStream =
  | { status: "active"; streamId: string }
  | { status: "offline" | "misconfigured" | "unavailable" };

type CachedAppToken = { value: string; expiresAt: number };

let cachedAppToken: CachedAppToken | null = null;

const TWITCH_ID = /^[1-9][0-9]{0,29}$/;

async function getTwitchAppToken(clientId: string, clientSecret: string) {
  if (cachedAppToken && cachedAppToken.expiresAt > Date.now()) return cachedAppToken.value;

  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) return null;

  const payload = await response.json().catch(() => null) as { access_token?: unknown; expires_in?: unknown } | null;
  if (!payload || typeof payload.access_token !== "string" || typeof payload.expires_in !== "number") return null;

  cachedAppToken = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(60, payload.expires_in - 60) * 1_000,
  };
  return cachedAppToken.value;
}

/** Resolves Twitch's authoritative live stream identifier without trusting Streamer.bot input. */
export async function getActiveTwitchStream(): Promise<ActiveTwitchStream> {
  const clientId = process.env.AUTH_TWITCH_ID?.trim();
  const clientSecret = process.env.AUTH_TWITCH_SECRET?.trim();
  const broadcasterId = process.env.TWITCH_BROADCASTER_ID?.trim();
  if (!clientId || !clientSecret || !broadcasterId || !TWITCH_ID.test(broadcasterId)) {
    return { status: "misconfigured" };
  }

  try {
    const token = await getTwitchAppToken(clientId, clientSecret);
    if (!token) return { status: "unavailable" };

    const response = await fetch(`https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(broadcasterId)}`, {
      headers: {
        "Client-Id": clientId,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return { status: "unavailable" };

    const payload = await response.json().catch(() => null) as { data?: Array<{ id?: unknown }> } | null;
    const streamId = payload?.data?.[0]?.id;
    if (typeof streamId !== "string" || !TWITCH_ID.test(streamId)) return { status: "offline" };
    return { status: "active", streamId };
  } catch {
    return { status: "unavailable" };
  }
}
