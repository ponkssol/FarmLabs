import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Twitter from "next-auth/providers/twitter";
import { prisma } from "@/lib/prisma";

// For local setup, fill X credentials in .env. Placeholder keeps build from failing without env values.
const providers = [
  Twitter({
    clientId: process.env.AUTH_TWITTER_ID ?? "UNSET",
    clientSecret: process.env.AUTH_TWITTER_SECRET ?? "UNSET",
  }),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.wallet = (user as { wallet?: string | null }).wallet ?? null;
      }
      return session;
    },
  },
});

