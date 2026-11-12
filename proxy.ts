import { NextResponse, type NextRequest } from "next/server";

const MAINTENANCE_PATH = "/maintenance";

function isMaintenanceEnabled() {
  return process.env.MAINTENANCE_MODE === "true";
}

function maintenanceHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    "Retry-After": "3600",
  };
}

/**
 * A production-only, global write freeze. The Vercel variable must be scoped
 * to Production; Preview stays untouched unless explicitly configured.
 */
export function proxy(request: NextRequest) {
  if (!isMaintenanceEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "UPMANDEX is temporarily unavailable for maintenance." },
      { status: 503, headers: maintenanceHeaders() },
    );
  }

  if (pathname === MAINTENANCE_PATH) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL(MAINTENANCE_PATH, request.url), {
    status: 503,
    headers: maintenanceHeaders(),
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
