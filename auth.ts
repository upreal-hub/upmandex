import NextAuth from "next-auth";
import Twitch from "next-auth/providers/twitch";
import { prisma } from "@/lib/prisma";
import { resolveTwitchIdentity } from "@/lib/twitch-identity";
import { normalizeTwitchLogin } from "@/lib/validation";

export const {
  handlers,
  signIn,
  signOut,
  auth,
} = NextAuth({
  session: {
    strategy: "jwt",
  },

  providers: [
    Twitch({
      clientId:
        process.env.AUTH_TWITCH_ID!,
      clientSecret:
        process.env.AUTH_TWITCH_SECRET!,
    }),
  ],

  callbacks: {
  async signIn({ user, account }) {
    const twitchLogin = normalizeTwitchLogin(user.name);
    const displayName = user.name?.trim();
    const twitchUserId = account?.provider === "twitch"
      ? account.providerAccountId
      : null;

    if (!twitchLogin || !displayName || !twitchUserId) {
      return false;
    }

    const isBootstrapAdmin = twitchLogin === "upreal_";

    const resolution = await prisma.$transaction(async (tx) => {
      const result = await resolveTwitchIdentity(tx, {
        twitchUserId,
        twitchLogin,
        displayName,
        avatar: user.image ?? null,
      });

      if (result.status === "identity-conflict") {
        return result;
      }

      if (isBootstrapAdmin) {
        await tx.user.update({
          where: { id: result.user.id },
          data: { role: "ADMIN" },
        });
      }

      return result;
    });

    if (resolution.status === "identity-conflict") {
      throw new Error("Twitch identity conflict");
    }

    return true;
  },
},
});
