import "server-only";

import { fetchQuery } from "convex/nextjs";

import { api } from "../../convex/_generated/api";
import {
  serializePublicThemeCss,
  type PublicThemeSnapshot,
} from "@content/theme-contract";
import { DEFAULT_PUBLIC_THEME_SNAPSHOT } from "@content/theme-presets";
import { getConvexDeploymentUrl } from "@/lib/convex";

export type PublicThemeDelivery = {
  name: string;
  publicRevision: number;
  css: string;
  source: "published" | "fallback";
};

function fallbackTheme(): PublicThemeDelivery {
  return {
    name: "Relay Cobalt",
    publicRevision: 0,
    css: serializePublicThemeCss(DEFAULT_PUBLIC_THEME_SNAPSHOT),
    source: "fallback",
  };
}

function serializePublishedTheme(payload: {
  name: string;
  publicRevision: number;
  contractVersion: 1;
  snapshot: PublicThemeSnapshot;
}): PublicThemeDelivery {
  if (
    !Number.isSafeInteger(payload.publicRevision) ||
    payload.publicRevision < 1 ||
    payload.contractVersion !== 1
  ) {
    throw new Error("Published theme metadata is invalid.");
  }

  return {
    name: payload.name,
    publicRevision: payload.publicRevision,
    css: serializePublicThemeCss(payload.snapshot),
    source: "published",
  };
}

export async function getPublicThemeDelivery(): Promise<PublicThemeDelivery> {
  const convexUrl = getConvexDeploymentUrl();
  if (convexUrl === undefined) {
    return fallbackTheme();
  }

  try {
    const published = await fetchQuery(
      api.publicThemes.getPublished,
      {},
      { url: convexUrl },
    );
    return published === null ? fallbackTheme() : serializePublishedTheme(published);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[theme] The checked-in public theme is being used.",
        error instanceof Error ? error.message : "Published theme read failed.",
      );
    }
    return fallbackTheme();
  }
}
