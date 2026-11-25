import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  isPrivateSiteAuthPath, isPrivateSiteIntegrationPath, isPrivateSiteMember,
} from "@/lib/private-site-access";
import { isSitePrivate, readPublication } from "@/lib/site-publication";
import { isMewPreparationTarget } from "@/lib/mew-session-operation.mjs";
import { mewTarget } from "@/lib/mew-runtime-target.mjs";
import { getBearerToken, isStreamerBotAuthorized } from "@/lib/streamerbot-auth";
import { isEventUpmanAuthorized } from "@/lib/eventupman-auth";
import { isStreamChatAuthorized } from "@/lib/stream-chat-auth";
import { canReadDisplay } from "@/lib/gartic-feud-token";
import { prisma } from "@/lib/prisma";
import { isStreamSpritePath, isStreamSubmissionRequest } from "@/lib/stream-media-path";

const privateProxy = (waitingUrl: URL) => auth((request) => {
  const path = request.nextUrl.pathname;
  const headers = { "Cache-Control": "private, no-store" };
  if (path.startsWith("/_next/static/") ||
      ((request.method === "GET" || request.method === "HEAD") && path === "/waiting")) return NextResponse.next({ headers });

  if (isPrivateSiteIntegrationPath(request.method, path)) {
    const token = getBearerToken(request) ?? "";
    const authorized = path === "/api/event-redeems" ? isEventUpmanAuthorized(token)
      : ["/api/stream-profile", "/api/stream-card", "/api/twitch-achievement-events"].includes(path)
        ? isStreamChatAuthorized(token) : isStreamerBotAuthorized(token);
    if (authorized) return NextResponse.next({ headers });
  }

  const id = request.auth?.user?.twitchUserId;
  if (isPrivateSiteMember(id)) return NextResponse.next({ headers });
  if (!id && request.method === "GET" && !path.startsWith("/api/") && path !== "/api") {
    // Auth.js rewrites request.url to AUTH_URL; the waiting page must stay on the incoming deployment.
    return NextResponse.redirect(waitingUrl, { headers });
  }
  return NextResponse.json({ error: "Private access required" }, { status: id ? 403 : 401, headers });
});

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // The standalone overlay shell contains no game data. Its read API also checks the OBS credential.
  if (((request.method === "GET" || request.method === "HEAD") && path === "/gartic-feud/display") ||
      (request.method === "GET" && path === "/api/gartic-feud/display" &&
        canReadDisplay(request.headers.get("authorization"), process.env.AUTH_SECRET))) {
    return NextResponse.next({ headers: { "Cache-Control": "private, no-store" } });
  }
  if (process.env.UPMANDEX_MEW_RUNTIME_ENABLED === "1" && request.method === "GET" &&
      request.nextUrl.pathname === "/api/auth/providers") {
    const publication = isMewPreparationTarget(process.env, mewTarget) ? await readPublication() : null;
    if (!publication?.available || publication.status !== "PRIVATE") {
      return new Response(null, { status: 503, headers: { "Cache-Control": "private, no-store" } });
    }
  }
  // Exact-path entry only: handlers require the primary ADMIN Twitch session;
  // POST additionally requires a same-origin, expiring confirmation ticket.
  if (process.env.UPMANDEX_MEW_RUNTIME_ENABLED === "1" && ["GET", "POST"].includes(request.method) && request.nextUrl.pathname === "/api/operations/mew-private-transfer") {
    return NextResponse.next({ headers: { "Cache-Control": "private, no-store" } });
  }
  if (process.env.UPMANDEX_MEW_RUNTIME_ENABLED === "1" && request.method !== "GET" && request.method !== "HEAD" &&
      !isPrivateSiteAuthPath(request.method, request.nextUrl.pathname)) {
    return NextResponse.json({ error: "Operation deployment is read-only here" }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  }
  // Auth.js handles its own routes. Wrapping them with auth() adds a second set
  // of cookies from its session lookup, which can conflict with the CSRF cookie.
  if (isPrivateSiteAuthPath(request.method, path)) {
    return NextResponse.next({ headers: { "Cache-Control": "private, no-store" } });
  }
  if (await isSitePrivate()) {
    if (request.method === "GET" || request.method === "HEAD") {
      const headers = { "Cache-Control": "private, no-store" };
      if (isStreamSubmissionRequest(path, request.nextUrl.search)) return NextResponse.next({ headers });
      if (!request.nextUrl.search && isStreamSpritePath(path)) {
        const publicSprite = await prisma.upman.findFirst({
          where: { image: path, dexVisibility: "PUBLIC", rarity: { not: "Secret" } },
          select: { id: true },
        }).catch(() => null);
        if (publicSprite) return NextResponse.next({ headers });
      }
    }
    return privateProxy(new URL("/waiting", request.url))(request, { params: Promise.resolve({}) });
  }
  const headers = { "Cache-Control": "private, no-store" };
  if ((request.method === "GET" || request.method === "HEAD") && request.nextUrl.pathname === "/waiting") {
    return NextResponse.redirect(new URL("/", request.url), { headers });
  }
  return NextResponse.next({ headers });
}
