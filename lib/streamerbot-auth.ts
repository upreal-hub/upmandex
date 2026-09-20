import "server-only";

import { timingSafeEqual } from "crypto";

export function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export function isStreamerBotAuthorized(providedSecret: string): boolean {
  const expectedSecret = process.env.STREAMERBOT_SECRET;

  if (!providedSecret || !expectedSecret) {
    return false;
  }

  const provided = Buffer.from(providedSecret);
  const expected = Buffer.from(expectedSecret);

  return (
    provided.length === expected.length &&
    timingSafeEqual(provided, expected)
  );
}
