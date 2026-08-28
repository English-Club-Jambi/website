import type { NextConfig } from "next";

import { getAllowedDevOrigins } from "./src/config/dev-origins";

const useLocalMediaForQa =
  process.env.NEXT_PUBLIC_MEDIA_LOCAL_FALLBACK?.trim() === "1";
const turnstileSiteKey =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ||
  process.env.TURNSTILE_SITE_KEY?.trim();
const mediaBaseUrl = useLocalMediaForQa
  ? undefined
  : process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.trim() ||
    process.env.R2_PUBLIC_DEV?.trim();
const remotePatterns = mediaBaseUrl
  ? [new URL(`${mediaBaseUrl.replace(/\/+$/, "")}/**`)]
  : [];
const allowedDevOrigins = getAllowedDevOrigins();

const nextConfig: NextConfig = {
  allowedDevOrigins,
  devIndicators: false,
  // Keep route metadata in the initial document for every crawler and browser.
  // Public metadata depends on Convex content, so streaming it can make fast
  // audits and link unfurlers observe the page before its description arrives.
  htmlLimitedBots: /.*/,
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns,
  },
  env: {
    NEXT_PUBLIC_MEDIA_LOCAL_FALLBACK: useLocalMediaForQa ? "1" : "0",
    ...(turnstileSiteKey
      ? { NEXT_PUBLIC_TURNSTILE_SITE_KEY: turnstileSiteKey }
      : {}),
    ...(mediaBaseUrl
      ? { NEXT_PUBLIC_MEDIA_BASE_URL: mediaBaseUrl.replace(/\/+$/, "") }
      : {}),
  },
};

export default nextConfig;
