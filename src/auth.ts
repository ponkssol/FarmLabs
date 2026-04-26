import type { TwitterProfile } from "@auth/core/providers/twitter";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Twitter from "next-auth/providers/twitter";
import { prisma } from "@/lib/prisma";

// For local setup, fill X credentials in .env. Placeholder keeps build from failing without env values.
const providers = [
  Twitter({
    clientId: process.env.AUTH_TWITTER_ID ?? "UNSET",
    clientSecret: process.env.AUTH_TWITTER_SECRET ?? "UNSET",
    // Default provider only asked for profile_image_url; we need `username` for /x.com/{handle} links
    userinfo: "https://api.x.com/2/users/me?user.fields=profile_image_url,username",
  }),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "twitter" || !user?.id) {
        return true;
      }
      // Provider `profile()` only returns id/name/image, not username. Fetch from X API v2 with the
      // same token used at login (users.read scope) so we can store `xHandle` and link to x.com/handle.
      const acc = account as {
        userId?: string;
        access_token?: string | null;
      };
      let handle: string | undefined;

      if (acc.access_token) {
        const res = await fetch(
          "https://api.x.com/2/users/me?user.fields=username",
          { headers: { Authorization: `Bearer ${acc.access_token}` } },
        );
        if (res.ok) {
          const j = (await res.json()) as { data?: { username?: string } };
          handle = j.data?.username?.trim() ?? undefined;
        }
      }
      if (!handle && profile) {
        const data = (profile as TwitterProfile).data;
        handle = data?.username?.trim() ?? undefined;
      }
      if (handle) {
        await prisma.user.update({
          where: { id: user.id },
          data: { xHandle: handle },
        });
      }
      return true;
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.wallet = (user as { wallet?: string | null }).wallet ?? null;
      }
      return session;
    },
  },
});

