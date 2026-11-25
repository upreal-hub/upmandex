import "server-only";
import { prisma } from "@/lib/prisma";
import { isPrivateSiteEnabled, isPrivateSiteMember } from "@/lib/private-site-access";
import type { PublicationState } from "./site-publication-policy";

export async function readPublication(): Promise<(PublicationState & { available: boolean })> {
  try {
    const rows = await prisma.$queryRaw<PublicationState[]>`
      SELECT "status", "version" FROM "SitePublication" WHERE "id" = 'anniversary'`;
    const row = rows[0];
    if (row && ["PRIVATE", "PUBLIC"].includes(row.status) && Number.isSafeInteger(row.version) && row.version >= 0) {
      return { ...row, available: true };
    }
  } catch {
    // Missing migration, unavailable database, or malformed state must never open the site.
  }
  return { status: "PRIVATE", version: 0, available: false };
}

export async function isSitePrivate() {
  if (process.env.UPMANDEX_MEW_RUNTIME_ENABLED === "1") return true;
  // This branch must never become public because final deployment variables were omitted.
  if (process.env.VERCEL === "1" && (process.env.UPMANDEX_ENV !== "anniversary" || process.env.UPMANDEX_PRIVATE_ACCESS !== "1")) return true;
  // Retain the existing opt-in on installations which do not use Anniversary release control.
  return isPrivateSiteEnabled() && (await readPublication()).status !== "PUBLIC";
}

export function publicationReadiness(available: boolean) {
  const reasons: string[] = [];
  if (!available) reasons.push("Publication storage unavailable; authorized migration required.");
  if (process.env.UPMANDEX_PRIVATE_ACCESS !== "1" || process.env.UPMANDEX_ENV !== "anniversary") reasons.push("Anniversary private access must remain configured.");
  if (process.env.UPMANDEX_RELEASE_READY !== "1") reasons.push("Launch prerequisites have not been approved.");
  if (process.env.UPMANDEX_AUTH_DIAGNOSTIC === "1" || process.env.UPMANDEX_MEW_RUNTIME_ENABLED === "1") reasons.push("Temporary authentication or transfer mode must be disabled.");
  if (!/^[1-9]\d{0,29}$/.test(process.env.UPMANDEX_RELEASE_ADMIN_TWITCH_ID ?? "")) reasons.push("Primary administrator not configured.");
  if (!isPrivateSiteMember(process.env.UPMANDEX_RELEASE_ADMIN_TWITCH_ID)) reasons.push("Primary administrator must remain in the private access list.");
  if (![process.env.AUTH_SECRET, process.env.AUTH_TWITCH_ID, process.env.AUTH_TWITCH_SECRET].every(Boolean)) reasons.push("Twitch authentication configuration incomplete.");
  if (!process.env.PRIVATE_BLOB_READ_WRITE_TOKEN) reasons.push("Private submission storage not configured.");
  return reasons;
}

export async function changePublication(input: PublicationState, actorTwitchId: string) {
  // One statement: compare-and-swap and append the audit record atomically. Never auto-create state.
  const rows = await prisma.$queryRaw<PublicationState[]>`
    UPDATE "SitePublication" SET "status" = ${input.status}, "version" = "version" + 1,
      "updatedAt" = CURRENT_TIMESTAMP,
      "history" = "history" || jsonb_build_array(jsonb_build_object(
        'from', "status", 'to', ${input.status}::text, 'actorTwitchId', ${actorTwitchId}::text,
        'at', CURRENT_TIMESTAMP, 'version', "version" + 1))
    WHERE "id" = 'anniversary' AND "version" = ${input.version} AND "status" <> ${input.status}
    RETURNING "status", "version"`;
  return rows[0] ?? null;
}
