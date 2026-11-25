import { canManageTwitchCommands } from "@/lib/twitch-command-owner";
import { CommandInputError } from "@/lib/twitch-command-catalog";
import { saveCommandCatalog } from "@/lib/twitch-command-store";

const reply = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return reply({ error: "Same-origin request required." }, 403);
  }
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return reply({ error: "JSON request required." }, 415);
  }
  if (!await canManageTwitchCommands()) return reply({ error: "Primary administrator access required." }, 403);
  const body = await request.json().catch(() => null);
  if (!Number.isSafeInteger(body?.revision) || body.revision < 0) return reply({ error: "Invalid catalog revision." }, 400);
  try {
    const saved = await saveCommandCatalog(body.revision, body.action);
    return saved ? reply(saved, 200) : reply({ error: "The catalog changed. Reload this page before saving again." }, 409);
  } catch (error) {
    if (error instanceof CommandInputError) return reply({ error: error.message }, 400);
    return reply({ error: "The command catalog is unavailable." }, 503);
  }
}
