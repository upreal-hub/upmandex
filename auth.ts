import NextAuth from "next-auth";
import Twitch from "next-auth/providers/twitch";

export const {
  handlers,
  signIn,
  signOut,
  auth,
} = NextAuth({
  debug: true,

  session: {
    strategy: "jwt",
  },

  providers: [
    Twitch({
      clientId: process.env.AUTH_TWITCH_ID!,
      clientSecret: process.env.AUTH_TWITCH_SECRET!,
    }),
  ],
});