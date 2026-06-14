import NextAuth from "next-auth";
import Twitch from "next-auth/providers/twitch";

console.log("AUTH INIT");
console.log("AUTH_TWITCH_ID =", !!process.env.AUTH_TWITCH_ID);
console.log("AUTH_TWITCH_SECRET =", !!process.env.AUTH_TWITCH_SECRET);
console.log("AUTH_SECRET =", !!process.env.AUTH_SECRET);

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