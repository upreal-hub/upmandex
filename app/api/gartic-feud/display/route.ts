import { displayView } from "@/lib/gartic-feud";
import { readGame } from "@/lib/gartic-feud-store";
import { canReadDisplay } from "@/lib/gartic-feud-token";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (!canReadDisplay(request.headers.get("authorization"), process.env.AUTH_SECRET)) {
    return Response.json({ error: "This OBS link is invalid or has expired." }, { status: 401, headers });
  }
  try {
    const { state } = await readGame();
    return Response.json(displayView(state), { headers });
  } catch {
    return Response.json({ error: "The display is temporarily unavailable." }, { status: 503, headers });
  }
}
