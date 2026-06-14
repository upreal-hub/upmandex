import NextAuth from "next-auth";
import Twitch from "next-auth/providers/twitch";
import { prisma } from "@/lib/prisma";

console.log(
  "TWITCH ID =",
  process.env.AUTH_TWITCH_ID
);

console.log(
  "TWITCH SECRET LENGTH =",
  process.env.AUTH_TWITCH_SECRET?.length
);

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

    console.log("SIGNIN USER =", user);

    if (!user.name) {
      return false;
    }

    await prisma.user.upsert({
      where: {
        twitchLogin: user.name,
      },
      update: {
        displayName: user.name,
        avatar: user.image ?? null,
      },
      create: {
        twitchLogin: user.name,
        displayName: user.name,
        avatar: user.image ?? null,
      },
    });

    console.log("USER SAVED");

    return true;
  },
},
});