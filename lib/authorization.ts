import "server-only";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type AuthorizationResult =
  | {
      ok: true;
      user: {
        id: string;
        twitchLogin: string;
        role: "ADMIN";
      };
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function requireAdmin(): Promise<AuthorizationResult> {
  const session = await auth();
  const sessionLogin = session?.user?.name?.trim().toLowerCase();

  if (!sessionLogin) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { twitchLogin: sessionLogin },
    select: { id: true, twitchLogin: true, role: true },
  });

  if (!user || user.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      twitchLogin: user.twitchLogin,
      role: "ADMIN",
    },
  };
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const authorization = await requireAdmin();
  return authorization.ok;
}
