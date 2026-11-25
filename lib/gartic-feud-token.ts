import { createHmac, timingSafeEqual } from "node:crypto";

function signature(expires: string, secret: string) {
  return createHmac("sha256", secret).update("gartic-feud:display:v1:" + expires).digest("base64url");
}

export function issueDisplayToken(secret: string, now = Date.now()) {
  const expires = String(now + 12 * 60 * 60 * 1000);
  return expires + "." + signature(expires, secret);
}

export function canReadDisplay(header: string | null, secret: string | undefined, now = Date.now()) {
  const match = header?.match(/^Bearer (\d{13})\.([A-Za-z0-9_-]{43})$/);
  if (!secret || !match || Number(match[1]) <= now) return false;
  return timingSafeEqual(Buffer.from(match[2]), Buffer.from(signature(match[1], secret)));
}
