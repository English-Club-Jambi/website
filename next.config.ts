import type { NextConfig } from "next";

const useLocalMediaForQa =
  process.env.NEXT_PUBLIC_MEDIA_LOCAL_FALLBACK?.trim() === "1";
const mediaBaseUrl = useLocalMediaForQa
  ? undefined
  : process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.trim() ||
    process.env.R2_PUBLIC_DEV?.trim();
const remotePatterns = mediaBaseUrl
  ? [new URL(`${mediaBaseUrl.replace(/\/+$/, "")}/**`)]
  : [];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
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
    ...(mediaBaseUrl
      ? { NEXT_PUBLIC_MEDIA_BASE_URL: mediaBaseUrl.replace(/\/+$/, "") }
      : {}),
  },
};

export default nextConfig;
