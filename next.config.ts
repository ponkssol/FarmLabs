import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Browsers and crawlers request /favicon.ico by default; point to the real JPEG in /public. */
  async rewrites() {
    return {
      beforeFiles: [{ source: "/favicon.ico", destination: "/favicon.jpg" }],
    };
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "abs.twimg.com" },
      { protocol: "https", hostname: "t.me" },
    ],
  },
};

export default nextConfig;
