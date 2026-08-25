import type { MetadataRoute } from "next";

import { getSitemapPosts } from "@/lib/journal";
import { absoluteUrl } from "@/lib/seo";

const staticRoutes = [
  "/",
  "/about",
  "/activities",
  "/members",
  "/practice",
  "/journal",
  "/contact",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getSitemapPosts();
  const latestPostUpdate = posts.reduce(
    (latest, post) => Math.max(latest, post.updatedAt),
    Date.UTC(2026, 7, 25),
  );

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route),
      lastModified: new Date(latestPostUpdate),
      changeFrequency: route === "/journal" ? ("weekly" as const) : ("monthly" as const),
      priority:
        route === "/"
          ? 1
          : route === "/contact" || route === "/practice"
            ? 0.8
            : 0.7,
    })),
    ...posts.map((post) => ({
      url: absoluteUrl(`/journal/${post.slug}`),
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
