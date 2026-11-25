import { NextResponse } from "next/server";
import { isReleaseOwner, publicationRequest } from "@/lib/site-publication-policy";
import { readPublication, changePublication, publicationReadiness } from "@/lib/site-publication";


const headers = { "Cache-Control": "private, no-store" };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

export function createPublicationHandlers(currentAdminId: () => Promise<string | null>) {
async function owner() {
  const id = await currentAdminId();
  return isReleaseOwner(id, process.env.UPMANDEX_RELEASE_ADMIN_TWITCH_ID) ? id! : null;
}

async function GET() {
  if (!await owner()) return reply({ error: "Primary administrator required" }, 403);
  const state = await readPublication();
  const allowedUsers = new Set((process.env.UPMANDEX_PRIVATE_TWITCH_IDS ?? "").split(",")
    .map(id => id.trim()).filter(id => /^[1-9]\d{0,29}$/.test(id))).size;
  return reply({ ...state, allowedUsers, blockers: publicationReadiness(state.available) });
}

async function POST(request: Request) {
  // Exact same-origin request required in addition to the authenticated session.
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin ||
      request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return reply({ error: "Same-origin JSON request required" }, 403);
  }
  const actor = await owner();
  if (!actor) return reply({ error: "Primary administrator required" }, 403);
  const input = publicationRequest(await request.json().catch(() => null));
  if (!input) return reply({ error: "Explicit confirmation and current version required" }, 400);
  const before = await readPublication();
  if (!before.available || (input.status === "PUBLIC" && publicationReadiness(true).length)) {
    return reply({ error: "Publication prerequisites not satisfied" }, 503);
  }
  try {
    const result = await changePublication(input, actor);
    return result ? reply(result) : reply({ error: "State changed or action already completed. Refresh." }, 409);
  } catch {
    return reply({ error: "Publication change failed. Refresh to check the persisted state." }, 503);
  }
}

return { GET, POST };
}
