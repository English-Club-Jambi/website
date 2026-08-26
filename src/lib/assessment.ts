import "server-only";

import { fetchQuery } from "convex/nextjs";
import type { FunctionReturnType } from "convex/server";

import { api } from "../../convex/_generated/api";
import type { PracticeSkill } from "@/content/assessment";
import { getConvexDeploymentUrl } from "@/lib/convex";

export type AssessmentCatalogPage = FunctionReturnType<
  typeof api.assessments.listPublished
>;
export type AssessmentCatalogItem = AssessmentCatalogPage["page"][number];
export type PublishedAssessment = NonNullable<
  FunctionReturnType<typeof api.assessments.getPublishedBySlug>
>;

export type AssessmentRead<T> =
  | { state: "ready"; data: T }
  | { state: "unavailable"; data: T };

const emptyCatalog: AssessmentCatalogPage = {
  page: [],
  isDone: true,
  continueCursor: "",
};

export async function getAssessmentCatalog(): Promise<
  AssessmentRead<AssessmentCatalogPage>
> {
  const deploymentUrl = getConvexDeploymentUrl();
  if (deploymentUrl === undefined) {
    return { state: "unavailable", data: emptyCatalog };
  }

  try {
    const data = await fetchQuery(
      api.assessments.listPublished,
      {
        paginationOpts: {
          cursor: null,
          numItems: 12,
          maximumRowsRead: 12,
        },
      },
      { url: deploymentUrl },
    );
    return { state: "ready", data };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[assessment] Published catalog is unavailable.",
        error instanceof Error ? error.name : "Unknown error",
      );
    }
    return { state: "unavailable", data: emptyCatalog };
  }
}

async function getPublishedAssessmentBySlug(
  slug: string,
): Promise<AssessmentRead<PublishedAssessment | null>> {
  const deploymentUrl = getConvexDeploymentUrl();
  if (deploymentUrl === undefined) {
    return { state: "unavailable", data: null };
  }

  try {
    const data = await fetchQuery(
      api.assessments.getPublishedBySlug,
      { slug },
      { url: deploymentUrl },
    );
    return { state: "ready", data };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[assessment] Published entry ${slug} is unavailable.`,
        error instanceof Error ? error.name : "Unknown error",
      );
    }
    return { state: "unavailable", data: null };
  }
}

async function findPublishedAssessment(
  predicate: (entry: AssessmentCatalogItem) => boolean,
): Promise<AssessmentRead<PublishedAssessment | null>> {
  const catalog = await getAssessmentCatalog();
  const entry = catalog.data.page.find(predicate);
  if (entry === undefined) {
    return { state: catalog.state, data: null };
  }
  return getPublishedAssessmentBySlug(entry.slug);
}

export function getFullPracticeAssessment() {
  return findPublishedAssessment(
    (entry) =>
      entry.kind === "full-practice" &&
      entry.skills.length === 3 &&
      (["listening", "structure", "reading"] as const).every((skill) =>
        entry.skills.includes(skill),
      ),
  );
}

const backendSkillByRoute: Record<
  PracticeSkill,
  "listening" | "structure" | "reading"
> = {
  listening: "listening",
  structure: "structure",
  reading: "reading",
};

export function getQuickPracticeAssessment(skill: PracticeSkill) {
  const backendSkill = backendSkillByRoute[skill];
  return findPublishedAssessment(
    (entry) =>
      entry.kind === "skill-quiz" && entry.skills.includes(backendSkill),
  );
}
