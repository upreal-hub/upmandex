import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import Twitch from "next-auth/providers/twitch";
import { prisma } from "@/lib/prisma";
import { resolveTwitchIdentity } from "@/lib/twitch-identity";
import { normalizeTwitchLogin } from "@/lib/validation";
import { isPrivateSiteMember } from "@/lib/private-site-access";
import { isSitePrivate, readPublication } from "@/lib/site-publication";
import { isMewPreparationTarget, mewSessionAuthOrigin } from "@/lib/mew-session-operation.mjs";
import { mewTarget } from "@/lib/mew-runtime-target.mjs";
import { logAuthDiagnostic, logAuthJsError, privateConfigInvalid, safeAuthCode } from "@/lib/auth-diagnostics.mjs";

// Only the temporary isolated operation deployment uses its own OAuth origin.
const operationOrigin = (() => {
  try { return mewSessionAuthOrigin(process.env); }
  catch (error) { logAuthDiagnostic("private-config-invalid"); throw error; }
})();
if (operationOrigin) {
  process.env.AUTH_URL = operationOrigin;
  process.env.NEXTAUTH_URL = operationOrigin;
}

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { twitchUserId?: string; isAdmin?: boolean };
  }
}

function denied(stage: string, twitchUserId: string | null, code?: string) {
  logAuthDiagnostic(stage, twitchUserId, { code });
  return false;
}

export const authConfig = {
  debug: false,
  logger: {
    error: logAuthJsError,
    warn: () => logAuthDiagnostic("authjs-warning"),
  },
  session: { strategy: "jwt" },
  providers: [Twitch({
    clientId: process.env.AUTH_TWITCH_ID!,
    clientSecret: process.env.AUTH_TWITCH_SECRET!,
  })],
  callbacks: {
    async signIn({ user, account }) {
      const twitchUserId = account?.provider === "twitch" ? account.providerAccountId : null;
      let stage = "account";
      try {
      const clientId = process.env.AUTH_TWITCH_ID;
      if (!clientId) return denied("auth-config-incomplete", twitchUserId);
      if (!twitchUserId || !account?.access_token) return denied("account-incomplete", twitchUserId);
      const mewRuntime = process.env.UPMANDEX_MEW_RUNTIME_ENABLED === "1";
      if (mewRuntime && !isMewPreparationTarget(process.env, mewTarget)) {
        return denied("private-config-invalid", twitchUserId);
      }
      if (mewRuntime) {
        const publication = await readPublication();
        if (!publication.available || publication.status !== "PRIVATE") return denied("private-config-invalid", twitchUserId);
      }
      stage = "private-membership";
      if (mewRuntime || await isSitePrivate()) {
        // Diagnose configuration separately without granting or revoking any additional access.
        const invalid = privateConfigInvalid(process.env);
        if (invalid) logAuthDiagnostic("private-config-invalid", twitchUserId);
        if (!isPrivateSiteMember(twitchUserId)) return denied("private-not-allowed", twitchUserId);
      }
      // Twitch's OIDC display name is not an authoritative login for historical claims.
      stage = "helix-request";
      const response = await fetch("https://api.twitch.tv/helix/users", {
        headers: { Authorization: `Bearer ${account.access_token}`, "Client-Id": clientId },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);
      if (!response?.ok) return denied(response ? "helix-http-refused" : "helix-unreachable", twitchUserId, response ? String(response.status) : undefined);
      stage = "helix-profile";
      const payload = await response.json().catch(() => null) as {
        data?: Array<{ id?: unknown; login?: unknown; display_name?: unknown; profile_image_url?: unknown }>;
      } | null;
      const profile = payload?.data?.[0];
      if (profile?.id !== twitchUserId || typeof profile.login !== "string") return denied("helix-identity-mismatch", twitchUserId);
      const twitchLogin = normalizeTwitchLogin(profile.login);
      if (!twitchLogin) return denied("invalid-twitch-login", twitchUserId);
      if (mewRuntime) {
        stage = "database-identity-resolution";
        const linked = await prisma.user.findUnique({ where: { twitchUserId }, select: { twitchLogin: true } });
        return linked?.twitchLogin === twitchLogin || denied("database-identity-conflict", twitchUserId);
      }
      const displayName = typeof profile.display_name === "string" && profile.display_name.trim()
        ? profile.display_name.trim() : twitchLogin;
      stage = "database-identity-resolution";
      const result = await prisma.$transaction((tx) => resolveTwitchIdentity(tx, {
        twitchUserId, twitchLogin, displayName,
        avatar: typeof profile.profile_image_url === "string" ? profile.profile_image_url : user.image ?? null,
      }, (state) => {
        if (twitchUserId === process.env.UPMANDEX_RELEASE_ADMIN_TWITCH_ID) logAuthDiagnostic(state, twitchUserId);
      }));
      return result.status === "resolved" || denied("database-identity-conflict", twitchUserId);
      } catch (error) {
        const failure = error as { code?: unknown; errorCode?: unknown };
        denied(stage, twitchUserId, safeAuthCode(failure?.code) ?? safeAuthCode(failure?.errorCode));
        throw error; // Preserve the existing fail-closed Auth.js behavior.
      }
    },
    async jwt({ token, account }) {
      if (account?.provider === "twitch") {
        token.twitchUserId = account.providerAccountId;
        const user = await prisma.user.findUnique({
          where: { twitchUserId: account.providerAccountId },
          select: { role: true },
        });
        token.isAdmin = user?.role === "ADMIN";
      }
      if (typeof token.twitchUserId !== "string") return null;
      if (await isSitePrivate() && !isPrivateSiteMember(token.twitchUserId)) {
        denied("jwt-private-not-allowed", token.twitchUserId);
        return null;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.twitchUserId === "string") session.user.twitchUserId = token.twitchUserId;
      session.user.isAdmin = token.isAdmin === true;
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
