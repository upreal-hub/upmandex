import NextAuth from "next-auth";
import Twitch from "next-auth/providers/twitch";
import { prisma } from "@/lib/prisma";

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
  async signIn({ user }) {
    if (!user.name) {
      return false;
    }

    const twitchLogin = user.name.trim().toLowerCase();
    const isBootstrapAdmin = twitchLogin === "upreal_";

    await prisma.user.upsert({
      where: {
        twitchLogin,
      },
      update: {
        displayName: user.name,
        avatar: user.image ?? null,
        ...(isBootstrapAdmin ? { role: "ADMIN" } : {}),
      },
      create: {
        twitchLogin,
        displayName: user.name,
        avatar: user.image ?? null,
        role: isBootstrapAdmin ? "ADMIN" : "USER",
      },
    });

    return true;
  },
},
});
