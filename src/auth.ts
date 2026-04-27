import type { TwitterProfile } from "@auth/core/providers/twitter";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Twitter from "next-auth/providers/twitter";
import { isXHandleInAllowlist } from "@/lib/auth-x-allowlist";
import { prisma } from "@/lib/prisma";
import { findOrCreateUserForTelegramWidget } from "@/lib/telegram-signin-user";

// For local setup, fill X credentials in .env. Placeholder keeps build from failing without env values.
const providers = [
  Twitter({
    clientId: process.env.AUTH_TWITTER_ID ?? "UNSET",
    clientSecret: process.env.AUTH_TWITTER_SECRET ?? "UNSET",
    // Do not add unknown OAuth query params (e.g. prompt) — some X app configs reject them and return AccessDenied.
    // Default provider only asked for profile_image_url; we need `username` for /x.com/{handle} links
    userinfo: "https://api.x.com/2/users/me?user.fields=profile_image_url,username",
  }),
  Credentials({
    id: "telegram",
    name: "Telegram",
    credentials: {
      payload: { label: "payload", type: "text" },
    },
    async authorize(credentials) {
      const p = credentials?.payload;
      if (typeof p !== "string" || p.length < 2) {
        return null;
      }
      const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
      if (!botToken) {
        return null;
      }
      let raw: Record<string, string | number | undefined>;
      try {
        raw = JSON.parse(p) as Record<string, string | number | undefined>;
      } catch {
        return null;
      }
      try {
        const user = await findOrCreateUserForTelegramWidget(prisma, botToken, raw);
        return {
          id: user.id,
          name: user.name ?? "Telegram",
          image: user.image,
          email: null,
        };
      } catch (e) {
        console.error("[auth] Telegram widget authorize error:", e);
        return null;
      }
    },
  }),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "database" },
  pages: { signIn: "/login", error: "/auth/error" },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "twitter" || !user?.id) {
        return true;
      }
      try {
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
          console.info("[auth][x] handle resolved:", handle);
          if (!isXHandleInAllowlist(handle)) {
            console.warn("[auth][x] handle rejected by allowlist:", handle);
            return false;
          }
          console.info("[auth][x] handle allowed by allowlist:", handle);
          await prisma.user.update({
            where: { id: user.id },
            data: { xHandle: handle },
          });
        } else {
          console.warn("[auth][x] no handle resolved from X profile/token");
          if (!isXHandleInAllowlist(null)) {
            console.warn("[auth][x] login rejected because allowlist requires a handle");
            return false;
          }
        }
      } catch (e) {
        console.error("[auth] signIn xHandle update failed (login still allowed):", e);
      }
      return true;
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.wallet = (user as { wallet?: string | null }).wallet ?? null;
        session.user.blueCheckmark = (user as { blueCheckmark?: boolean | null }).blueCheckmark ?? false;
      }
      return session;
    },
  },
});

