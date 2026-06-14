import NextAuth from "next-auth";
import Twitch from "next-auth/providers/twitch";

export const {
  handlers,
  signIn,
  signOut,
  auth,
} = NextAuth({
  debug: true,

  providers: [
    Twitch({
      clientId: process.env.AUTH_TWITCH_ID!,
      clientSecret: process.env.AUTH_TWITCH_SECRET!,
    }),
  ],

  callbacks: {
    async session({ session }) {
      console.log("SESSION =", session);
      return session;
    },

    async jwt({ token, profile }) {
      console.log("PROFILE =", profile);
      return token;
    },
  },
});