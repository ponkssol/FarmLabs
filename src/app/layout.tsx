import type { Metadata, Viewport } from "next";
import { Geist_Mono, Sora } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteMobileBottomNav } from "@/components/site-mobile-bottom-nav";

/** So OG URLs and <link rel="icon"> resolve in production, not as relative to unknown host. */
function getMetadataBase(): URL {
  const fromAuth = process.env.AUTH_URL?.trim();
  if (fromAuth) {
    try {
      return new URL(fromAuth);
    } catch {
      /* continue */
    }
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL("http://localhost:3000");
}

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: { default: "FarmLabs", template: "%s - FarmLabs" },
  description:
    "Pump.fun pre-launch directory with X, Telegram, Discord communities and launch plans.",
  verification: {
    google: "gM6mauGKVNhaoELbp_PNCmET8Vsr_ciR02VxBY0W1gE",
  },
  /**
   * Favicon: `public/favicon.jpg` only — use explicit <link> in root layout to avoid
   * duplicate rel="icon" from `app/icon.*` + default `favicon.ico` link in dev.
   * `/favicon.ico` → `/favicon.jpg` in `next.config.ts` for clients that only request .ico.
   */
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${sora.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <link rel="icon" href="/favicon.jpg" type="image/jpeg" sizes="any" />
        <link rel="apple-touch-icon" href="/favicon.jpg" />
      </head>
      <body className="min-h-full bg-black text-sm text-zinc-100 antialiased">
        <AppProviders>
          <div className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_35%)] pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <SiteMobileBottomNav />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
