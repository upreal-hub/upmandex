import { InvalidMove } from "@/lib/gartic-feud";
import { readGame, saveMove } from "@/lib/gartic-feud-store";
import { issueDisplayToken } from "@/lib/gartic-feud-token";

const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export function createGarticHostHandlers(isGarticOwner: () => Promise<boolean>) {
  async function GET() {
    if (!await isGarticOwner()) return reply({ error: "Primary administrator access required." }, 403);
    try { return reply(await readGame()); }
    catch { return reply({ error: "Gartic Feud storage is unavailable." }, 503); }
  }
  async function POST(request: Request) {
    if (request.headers.get("origin") !== new URL(request.url).origin ||
        request.headers.get("content-type")?.split(";")[0] !== "application/json" ||
        !await isGarticOwner()) return reply({ error: "Primary administrator access required." }, 403);
    const raw = await request.text();
    if (raw.length > 40000) return reply({ error: "The command is too large." }, 413);
    let body;
    try { body = JSON.parse(raw); }
    catch { return reply({ error: "Invalid JSON." }, 400); }
    if (body?.type === "obs") {
      const secret = process.env.AUTH_SECRET;
      return secret ? reply({ token: issueDisplayToken(secret) }) : reply({ error: "OBS link signing is unavailable." }, 503);
    }
    if (!Number.isSafeInteger(body?.revision) || body.revision < 0) return reply({ error: "Invalid revision." }, 400);
    try {
      const saved = await saveMove(body.revision, body);
      return saved ? reply(saved) : reply({ error: "The game changed. Check the current state before retrying." }, 409);
    } catch (error) {
      if (error instanceof InvalidMove) return reply({ error: error.message }, 400);
      return reply({ error: "Gartic Feud storage is unavailable. Check the state before retrying." }, 503);
    }
  }
  return { GET, POST };
}
