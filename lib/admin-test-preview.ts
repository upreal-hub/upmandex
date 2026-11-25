export function verifyAdminTestPreview(env: Readonly<Record<string, string | undefined>>) {
  if (env.UPMANDEX_ADMIN_TEST_PREVIEW !== "1") return;

  if (env.VERCEL_ENV !== "preview" || env.UPMANDEX_ENV !== "anniversary"
    || env.UPMANDEX_PRIVATE_ACCESS !== "1") {
    throw new Error("Admin test requires a private Anniversary Preview.");
  }
  const members = env.UPMANDEX_PRIVATE_TWITCH_IDS?.split(",").map(id => id.trim());
  if (!members || !members.every(id => /^[1-9]\d{0,29}$/.test(id))
    || new Set(members).size < 2) {
    throw new Error("Admin test requires distinct authorized Twitch accounts.");
  }
  let database: URL;
  try {
    database = new URL(env.DATABASE_URL ?? "");
  } catch {
    throw new Error("Admin test DATABASE_URL is missing or invalid.");
  }
  const expected = env.UPMANDEX_TEST_DATABASE_HOST;
  if (!expected || !/^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)*\.neon\.tech$/.test(expected)
    || database.hostname !== expected || database.protocol !== "postgresql:"
    || database.pathname !== "/neondb" || (database.port && database.port !== "5432")
    || !database.username || !database.password) {
    throw new Error("Admin test DATABASE_URL does not match the verified test endpoint.");
  }
  if (!env.AUTH_SECRET || !env.AUTH_TWITCH_ID || !env.AUTH_TWITCH_SECRET) {
    throw new Error("Admin test Twitch OAuth configuration is incomplete.");
  }
}
