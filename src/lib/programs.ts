import "server-only";

import { fetchQuery } from "convex/nextjs";
import { cache } from "react";

import type { ProgramRecord } from "@content/programs";
import { api } from "../../convex/_generated/api";
import { getConvexDeploymentUrl } from "@/lib/convex";

export type PublicProgram = ProgramRecord &
  Readonly<{
    publishedAt: number;
    updatedAt: number;
  }>;

const fetchPublishedPrograms = cache(async (convexUrl: string) =>
  fetchQuery(api.programs.listPublished, { limit: 24 }, { url: convexUrl }),
);

function reportUnavailable(error?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[programs] The published programme catalogue is unavailable; no local records were substituted.",
      error instanceof Error ? error.message : error ?? "Convex URL is not set.",
    );
  }
}

export async function getPublicPrograms(): Promise<ReadonlyArray<PublicProgram>> {
  const convexUrl = getConvexDeploymentUrl();
  if (convexUrl === undefined) {
    reportUnavailable();
    return [];
  }

  try {
    return await fetchPublishedPrograms(convexUrl);
  } catch (error) {
    reportUnavailable(error);
    return [];
  }
}
