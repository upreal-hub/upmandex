import "server-only";

import { timingSafeEqual } from "crypto";

export function isStreamChatAuthorized(providedSecret: string): boolean {
  const expectedSecret = process.env.STREAM_CHAT_SECRET;

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
