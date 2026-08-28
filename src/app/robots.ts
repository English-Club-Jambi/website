import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/admin/",
        "/practice/attempt/",
        "/practice/result/",
        "/practice/review",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
