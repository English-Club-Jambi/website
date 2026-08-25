import "server-only";

import { fetchQuery } from "convex/nextjs";
import { cache } from "react";

import { api } from "../../convex/_generated/api";
import {
  getPublicContentDefaults,
  mergePublishedPublicContent,
  publicContentLocale,
  type PublicContentFor,
  type PublicContentPageKey,
} from "@content/public-content";
import { getConvexDeploymentUrl } from "@/lib/convex";

const fetchPublishedPage = cache(
  async (
    convexUrl: string,
    pageKey: PublicContentPageKey,
    locale: typeof publicContentLocale,
  ) =>
    fetchQuery(
      api.siteContent.getPublishedPage,
      { pageKey, locale },
      { url: convexUrl },
    ),
);

function reportFallback(pageKey: PublicContentPageKey, error?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[content] Checked-in ${pageKey} copy is being used.`,
      error instanceof Error ? error.name : "Published content is unavailable.",
    );
  }
}

/**
 * Reads one bounded public page and returns the manifest-shaped DTO used by
 * React. Unknown keys, unsupported kinds, and invalid values never cross this
 * boundary. The checked-in organization copy remains available if Convex is
 * not configured or the query fails.
 */
export async function getPublicPageContent<
  PageKey extends PublicContentPageKey,
>(pageKey: PageKey): Promise<PublicContentFor<PageKey>> {
  const convexUrl = getConvexDeploymentUrl();
  if (convexUrl === undefined) {
    reportFallback(pageKey);
    return getPublicContentDefaults(pageKey);
  }

  try {
    const published = await fetchPublishedPage(
      convexUrl,
      pageKey,
      publicContentLocale,
    );
    return mergePublishedPublicContent(pageKey, published);
  } catch (error) {
    reportFallback(pageKey, error);
    return getPublicContentDefaults(pageKey);
  }
}
