export type IbtEstimateSkill =
  | "reading"
  | "listening"
  | "writing"
  | "speaking";

export type EstimateConfidence = "low" | "moderate";

const sectionBandThresholds: Record<
  IbtEstimateSkill,
  ReadonlyArray<readonly [minimumComparableScore: number, band: number]>
> = {
  reading: [
    [29, 6], [27, 5.5], [24, 5], [22, 4.5], [18, 4], [15, 3.5],
    [12, 3], [9, 2.5], [7, 2], [4, 1.5], [0, 1],
  ],
  listening: [
    [28, 6], [26, 5.5], [22, 5], [20, 4.5], [17, 4], [14, 3.5],
    [12, 3], [9, 2.5], [7, 2], [4, 1.5], [0, 1],
  ],
  writing: [
    [29, 6], [27, 5.5], [24, 5], [21, 4.5], [18, 4], [16, 3.5],
    [13, 3], [10, 2.5], [7, 2], [4, 1.5], [0, 1],
  ],
  speaking: [
    [28, 6], [27, 5.5], [25, 5], [23, 4.5], [20, 4], [18, 3.5],
    [16, 3], [13, 2.5], [10, 2], [7, 1.5], [0, 1],
  ],
};

const stopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "because", "but", "by",
  "for", "from", "had", "has", "have", "he", "her", "his", "i", "in",
  "is", "it", "its", "of", "on", "or", "our", "she", "that", "the",
  "their", "they", "this", "to", "was", "we", "were", "will", "with",
  "you", "your",
]);

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundTo(value: number, places: number) {
  const multiplier = 10 ** places;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

export function roundToHalf(value: number) {
  return Math.round(value * 2) / 2;
}

export function tokenizePracticeResponse(value: string) {
  return value
    .toLocaleLowerCase("en")
    .replace(/[’']/g, "'")
    .match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
}

function orderedCoverage(actual: string[], expected: string[]) {
  if (actual.length === 0 || expected.length === 0) return 0;
  const rows = expected.length + 1;
  const columns = actual.length + 1;
  const table = Array.from({ length: rows }, () => new Uint16Array(columns));
  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      table[row][column] =
        expected[row - 1] === actual[column - 1]
          ? table[row - 1][column - 1] + 1
          : Math.max(table[row - 1][column], table[row][column - 1]);
    }
  }
  return table[expected.length][actual.length] / expected.length;
}

function tokenCoverage(actual: string[], expected: string[]) {
  if (actual.length === 0 || expected.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const token of actual) counts.set(token, (counts.get(token) ?? 0) + 1);
  let matches = 0;
  for (const token of expected) {
    const count = counts.get(token) ?? 0;
    if (count > 0) {
      matches += 1;
      counts.set(token, count - 1);
    }
  }
  return matches / expected.length;
}

export function scoreRepeatTranscript(args: {
  response: string;
  target: string;
  maxPoints: number;
}) {
  const actual = tokenizePracticeResponse(args.response);
  const expected = tokenizePracticeResponse(args.target);
  if (actual.length === 0 || expected.length === 0) return 0;
  const coverage = tokenCoverage(actual, expected);
  const order = orderedCoverage(actual, expected);
  const lengthFit = Math.min(actual.length, expected.length) /
    Math.max(actual.length, expected.length);
  const ratio = coverage * 0.5 + order * 0.35 + lengthFit * 0.15;
  return clamp(roundToHalf(ratio * args.maxPoints), 0, args.maxPoints);
}

function phraseCoverage(response: string, targetTerms: string[]) {
  if (targetTerms.length === 0) return 1;
  const normalized = ` ${tokenizePracticeResponse(response).join(" ")} `;
  const matched = targetTerms.filter((term) => {
    const target = tokenizePracticeResponse(term).join(" ");
    return target.length > 0 && normalized.includes(` ${target} `);
  }).length;
  return matched / targetTerms.length;
}

export function scoreConstructedPracticeResponse(args: {
  response: string;
  minimumWords: number;
  targetTerms: string[];
  maxPoints: number;
}) {
  const tokens = tokenizePracticeResponse(args.response);
  if (tokens.length === 0) return 0;

  const completion = clamp(tokens.length / Math.max(1, args.minimumWords), 0, 1);
  const coverage = phraseCoverage(args.response, args.targetTerms);
  const sentenceCount = args.response
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean).length;
  const development = clamp(
    (sentenceCount >= 2 ? 0.65 : 0.35) +
      (tokens.length >= args.minimumWords ? 0.35 : 0),
    0,
    1,
  );
  const contentTokens = tokens.filter((token) => !stopWords.has(token));
  const lexicalDiversity = contentTokens.length === 0
    ? 0
    : new Set(contentTokens).size / contentTokens.length;
  const lexical = clamp(
    lexicalDiversity * 1.35 * Math.min(1, tokens.length / Math.max(8, args.minimumWords)),
    0,
    1,
  );
  const rawFivePoint =
    completion * 1.25 + coverage * 1.5 + development + lexical * 1.25;
  return clamp(
    roundTo((rawFivePoint / 5) * args.maxPoints, 2),
    0,
    args.maxPoints,
  );
}

export function estimateSectionScore(args: {
  skill: IbtEstimateSkill;
  earnedPoints: number;
  possiblePoints: number;
}) {
  const ratio = args.possiblePoints <= 0
    ? 0
    : clamp(args.earnedPoints / args.possiblePoints, 0, 1);
  const comparableScore = Math.round(ratio * 30);
  const band = sectionBandThresholds[args.skill].find(
    ([minimum]) => comparableScore >= minimum,
  )?.[1] ?? 1;
  const confidence: EstimateConfidence =
    args.skill === "reading" || args.skill === "listening"
      ? "moderate"
      : "low";
  return { comparableScore, band, confidence };
}

export function estimateOverallScore(
  sections: ReadonlyArray<{
    skill: IbtEstimateSkill;
    band: number;
    comparableScore: number;
  }>,
) {
  const skills = new Set(sections.map((section) => section.skill));
  if (
    sections.length !== 4 ||
    !(["reading", "listening", "writing", "speaking"] as const).every(
      (skill) => skills.has(skill),
    )
  ) {
    return null;
  }
  return {
    overallBand: roundToHalf(
      sections.reduce((total, section) => total + section.band, 0) / 4,
    ),
    comparableTotal: sections.reduce(
      (total, section) => total + section.comparableScore,
      0,
    ),
    confidence: "low" as const,
  };
}
