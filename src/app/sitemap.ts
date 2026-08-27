import type { MetadataRoute } from "next";

import { getSitemapPosts } from "@/lib/journal";
import { absoluteUrl } from "@/lib/seo";

const staticRoutes = [
  "/",
  "/about",
  "/activities",
  "/programs",
  "/members",
  "/practice",
  "/practice/full",
  "/practice/quick/listening",
  "/practice/quick/structure",
  "/practice/quick/reading",
  "/journal",
  "/privacy",
  "/contact",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getSitemapPosts();
  const latestPostUpdate = posts.reduce<number | undefined>(
    (latest, post) =>
      latest === undefined ? post.updatedAt : Math.max(latest, post.updatedAt),
    undefined,
  );

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route),
      ...((route === "/" || route === "/journal") &&
      latestPostUpdate !== undefined
        ? { lastModified: new Date(latestPostUpdate) }
        : {}),
    })),
    ...posts.map((post) => ({
      url: absoluteUrl(`/journal/${post.slug}`),
      lastModified: new Date(post.updatedAt),
    })),
  ];
}
