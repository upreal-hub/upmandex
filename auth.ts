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

  callbacks: {
    async jwt({ token, account, profile }) {
      console.log("JWT CALLBACK");
      console.log(JSON.stringify({ account, profile }));
      return token;
    },

    async session({ session }) {
      console.log("SESSION CALLBACK");
      return session;
    },
  },
});