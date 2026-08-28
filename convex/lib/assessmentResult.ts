import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export async function projectAttemptResult(
  ctx: QueryCtx,
  attempt: Doc<"assessmentAttempts">,
  resultId = attempt.currentResultId,
) {
  if (resultId === undefined) return null;
  const [result, definition, version] = await Promise.all([
    ctx.db.get("assessmentResults", resultId),
    ctx.db.get("assessmentDefinitions", attempt.definitionId),
    ctx.db.get("assessmentVersions", attempt.versionId),
  ]);
  if (
    result === null ||
    result.attemptId !== attempt._id ||
    definition === null ||
    version === null ||
    version.definitionId !== definition._id
  ) {
    return null;
  }
  const sectionResults = await ctx.db
    .query("assessmentSectionResults")
    .withIndex("by_result_id", (q) => q.eq("resultId", result._id))
    .take(9);
  if (sectionResults.length > 8) return null;
  const sections = [];
  for (const sectionResult of sectionResults) {
    const section = await ctx.db.get(
      "assessmentSections",
      sectionResult.sectionId,
    );
    if (section === null || section.versionId !== attempt.versionId) return null;
    sections.push({
      order: section.order,
      skill: sectionResult.skill,
      title: section.title,
      correct: sectionResult.correct,
      possible: sectionResult.possible,
      answered: sectionResult.answeredCount,
      items: sectionResult.itemCount,
      elapsedSeconds: sectionResult.elapsedSeconds,
      earnedPoints: sectionResult.earnedPoints ?? sectionResult.correct,
      possiblePoints: sectionResult.possiblePoints ?? sectionResult.possible,
      bandEstimate: sectionResult.bandEstimate ?? null,
      comparableScoreEstimate:
        sectionResult.comparableScoreEstimate ?? null,
      confidence: sectionResult.estimateConfidence ?? null,
      paperSectionEstimate: sectionResult.paperSectionEstimate ?? null,
    });
  }
  sections.sort((left, right) => left.order - right.order);
  if (sections.some((section, index) => section.order !== index)) return null;
  const label =
    attempt.listeningMode === "transcript-supported"
      ? ("Transcript-supported practice result" as const)
      : attempt.timingMode === "untimed"
        ? ("Untimed practice result" as const)
        : attempt.timingMode === "extended"
          ? ("Extended-time practice result" as const)
          : ("Practice result" as const);
  const disclaimer =
    result.scoringModel === "ec-ibt-style-v1"
      ? "The raw result is exact for the original questions delivered in this attempt. The band and 0-120 values are English Club estimates, not an official ETS score or an exact test prediction. A requested completion certificate records participation only; it does not certify this estimate, proficiency, or admission eligibility."
      : result.scoringModel === "ec-paper-linear-v1"
        ? "The raw correct counts are exact for the original questions delivered in this attempt. The 310-677 value uses a fixed English Club linear estimate; official ETS results use form-specific statistical equating and may differ. A requested completion certificate records participation only; it does not certify this estimate, proficiency, or admission eligibility."
        : "This is an English Club practice result based on original questions. It is not an official or predicted score. A requested completion certificate records participation only; it does not certify proficiency or admission eligibility.";

  return {
    status: result.status,
    kind: definition.kind,
    formTitle: version.title,
    completedAt: result.completedAt,
    resultRevision: result.revision,
    timingMode: attempt.timingMode,
    listeningMode: attempt.listeningMode,
    label,
    objective: {
      correct: result.correct,
      possible: result.possible,
      omitted: result.omitted,
    },
    weighted: {
      earned: result.earnedPoints ?? result.correct,
      possible: result.possiblePoints ?? result.possible,
    },
    estimate:
      result.scoringModel === "ec-ibt-style-v1"
        ? {
            model: result.scoringModel,
            overallBand: result.overallBandEstimate ?? null,
            comparableTotal: result.comparableTotalEstimate ?? null,
            confidence: result.estimateConfidence ?? "low",
          }
        : result.scoringModel === "ec-paper-linear-v1" &&
            result.paperTotalEstimate !== undefined
          ? {
              model: result.scoringModel,
              total: result.paperTotalEstimate,
              minimum: 310 as const,
              maximum: 677 as const,
              method: "fixed-linear" as const,
              confidence: "low" as const,
            }
          : null,
    sections,
    disclaimer,
  };
}
