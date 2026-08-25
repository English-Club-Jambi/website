import { describe, expect, it } from "vitest";

import {
  estimateOverallScore,
  estimateSectionScore,
  scoreConstructedPracticeResponse,
  scoreRepeatTranscript,
} from "../../convex/lib/assessmentEstimate";

describe("practice estimate model", () => {
  it("scores repeat transcripts by coverage and order", () => {
    const target = "Please return the recorder before the media desk closes.";
    expect(scoreRepeatTranscript({ response: target, target, maxPoints: 5 })).toBe(5);
    expect(scoreRepeatTranscript({
      response: "Please recorder return before desk media closes",
      target,
      maxPoints: 5,
    })).toBeLessThan(5);
    expect(scoreRepeatTranscript({ response: "", target, maxPoints: 5 })).toBe(0);
  });

  it("does not award full constructed-response credit for keyword stuffing", () => {
    const stuffed = scoreConstructedPracticeResponse({
      response: "quiet study outdoor space events quiet study outdoor space events",
      minimumWords: 80,
      targetTerms: ["quiet study", "outdoor space", "events"],
      maxPoints: 5,
    });
    const developed = scoreConstructedPracticeResponse({
      response: "A reserved outdoor space can give students a reliable place for quiet study between classes. Events still matter, so the rule could apply only during weekday study hours. In the evening, organisers could book the same space for talks or performances. This arrangement protects focused work without removing a useful event location from campus life.",
      minimumWords: 45,
      targetTerms: ["quiet study", "outdoor space", "events"],
      maxPoints: 5,
    });
    expect(stuffed).toBeLessThan(2.5);
    expect(developed).toBeGreaterThan(stuffed);
  });

  it("maps section ratios and computes an overall half band only for four skills", () => {
    const reading = estimateSectionScore({ skill: "reading", earnedPoints: 31.5, possiblePoints: 35 });
    const listening = estimateSectionScore({ skill: "listening", earnedPoints: 28, possiblePoints: 35 });
    const writing = estimateSectionScore({ skill: "writing", earnedPoints: 15, possiblePoints: 20 });
    const speaking = estimateSectionScore({ skill: "speaking", earnedPoints: 38.5, possiblePoints: 55 });
    expect(reading.comparableScore).toBe(27);
    expect(reading.band).toBe(5.5);
    expect(reading.confidence).toBe("moderate");
    expect(writing.confidence).toBe("low");

    const overall = estimateOverallScore([
      { skill: "reading", band: reading.band, comparableScore: reading.comparableScore },
      { skill: "listening", band: listening.band, comparableScore: listening.comparableScore },
      { skill: "writing", band: writing.band, comparableScore: writing.comparableScore },
      { skill: "speaking", band: speaking.band, comparableScore: speaking.comparableScore },
    ]);
    expect(overall).toEqual({ overallBand: 5, comparableTotal: 95, confidence: "low" });
    expect(estimateOverallScore([
      { skill: "reading", band: 5, comparableScore: 24 },
    ])).toBeNull();
  });
});
