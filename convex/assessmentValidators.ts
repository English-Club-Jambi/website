import { v } from "convex/values";

export const assessmentKindValidator = v.union(
  v.literal("full-practice"),
  v.literal("skill-quiz"),
  v.literal("club-program-quiz"),
);

export const assessmentProfileValidator = v.union(
  v.literal("ec-itp-level-1-aligned-v1"),
  v.literal("ec-ibt-style-2026-v1"),
  v.literal("club-program-v1"),
);

export const assessmentVisibilityValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("retired"),
);

export const assessmentVersionStatusValidator = v.union(
  v.literal("draft"),
  v.literal("cloning"),
  v.literal("validating"),
  v.literal("ready"),
  v.literal("published"),
  v.literal("retired"),
  v.literal("clone-failed"),
);

export const assessmentSkillValidator = v.union(
  v.literal("listening"),
  v.literal("structure"),
  v.literal("reading"),
  v.literal("writing"),
  v.literal("speaking"),
);

export const assessmentTaskFamilyValidator = v.union(
  v.literal("complete-words"),
  v.literal("read-daily-life"),
  v.literal("read-academic-passage"),
  v.literal("listen-choose-response"),
  v.literal("listen-conversation"),
  v.literal("listen-announcement"),
  v.literal("listen-academic-talk"),
  v.literal("structure-sentence-completion"),
  v.literal("structure-written-expression"),
  v.literal("build-sentence"),
  v.literal("write-email"),
  v.literal("academic-discussion"),
  v.literal("listen-repeat"),
  v.literal("take-interview"),
);

export const assessmentQuestionDifficultyValidator = v.union(
  v.literal("foundational"),
  v.literal("developing"),
  v.literal("advanced"),
);

export const assessmentQuestionBankStatusValidator = v.union(
  v.literal("ready"),
  v.literal("paused"),
  v.literal("archived"),
);

export const assessmentQuestionDependencyRoleValidator = v.union(
  v.literal("anchor"),
  v.literal("follow-up"),
);

export const assessmentFlagReviewStatusValidator = v.union(
  v.literal("open"),
  v.literal("reviewed"),
  v.literal("dismissed"),
);

export const assessmentDeliveryModeValidator = v.union(
  v.literal("fixed"),
  v.literal("random-bank"),
);

export const timePolicyValidator = v.union(
  v.literal("untimed"),
  v.literal("whole-assessment"),
  v.literal("per-section"),
);

export const reviewPolicyValidator = v.union(
  v.literal("none"),
  v.literal("after-section"),
  v.literal("after-submit"),
);

export const scorePolicyValidator = v.union(
  v.literal("feedback-only"),
  v.literal("raw-objective"),
  v.literal("practice-estimate-v1"),
  v.literal("paper-estimate-v1"),
);

export const audioReplayPolicyValidator = v.union(
  v.literal("unlimited"),
  v.literal("once"),
  v.literal("twice"),
);

export const stimulusKindValidator = v.union(
  v.literal("reading"),
  v.literal("audio"),
  v.literal("image"),
);

export const itemTypeValidator = v.union(
  v.literal("single-choice"),
  v.literal("multiple-select"),
  v.literal("cloze-select"),
  v.literal("sentence-build"),
  v.literal("constructed-response"),
);

export const attemptOwnerKindValidator = v.union(
  v.literal("anonymous"),
  v.literal("account"),
);

export const timingModeValidator = v.union(
  v.literal("standard"),
  v.literal("extended"),
  v.literal("untimed"),
);

export const listeningModeValidator = v.union(
  v.literal("audio-primary"),
  v.literal("transcript-supported"),
);

export const attemptStatusValidator = v.union(
  v.literal("in-progress"),
  v.literal("section-review"),
  v.literal("submitting"),
  v.literal("submitted"),
  v.literal("abandoned"),
);

export const attemptSectionStatusValidator = v.union(
  v.literal("not-started"),
  v.literal("in-progress"),
  v.literal("review"),
  v.literal("completed"),
);

export const responseKindValidator = v.union(
  v.literal("choice"),
  v.literal("multi-choice"),
  v.literal("cloze"),
  v.literal("token-order"),
  v.literal("text"),
);

export const resultStatusValidator = v.union(
  v.literal("final"),
  v.literal("adjusted"),
);

export const certificateTemplateValidator = v.union(
  v.literal("mendalo-record"),
  v.literal("cobalt-selvedge"),
  v.literal("titik-folio"),
);

export const resultDeliveryStatusValidator = v.union(
  v.literal("preparing"),
  v.literal("sending"),
  v.literal("accepted"),
  v.literal("uncertain"),
  v.literal("failed"),
);

export const resultDeliveryFailureValidator = v.union(
  v.literal("certificate_unavailable"),
  v.literal("provider_unavailable"),
  v.literal("provider_uncertain"),
  v.literal("configuration_unavailable"),
);

export const assessmentReviewGrantStatusValidator = v.union(
  v.literal("active"),
  v.literal("revoked"),
);

export const mediaAccessValidator = v.union(
  v.literal("public"),
  v.literal("assessment-private"),
);

export const versionCheckStatusValidator = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("passed"),
  v.literal("failed"),
);

export const assessmentReviewTypeValidator = v.union(
  v.literal("academic"),
  v.literal("rights"),
  v.literal("accessibility"),
  v.literal("bias"),
);

export const assessmentReviewDecisionValidator = v.union(
  v.literal("approved"),
  v.literal("changes-requested"),
  v.literal("rejected"),
);

export const answerKeyKindValidator = v.union(
  v.literal("choice"),
  v.literal("multi-choice"),
  v.literal("cloze"),
  v.literal("token-order"),
  v.literal("text-rubric"),
);

export const constructedResponseModeValidator = v.union(
  v.literal("writing"),
  v.literal("speaking-repeat"),
  v.literal("speaking-interview"),
);

export const scoreConfidenceValidator = v.union(
  v.literal("low"),
  v.literal("moderate"),
);

export const answerScoringModeValidator = v.union(
  v.literal("exact"),
  v.literal("all-or-nothing"),
  v.literal("rubric-v1"),
);

export const assessmentOptionValidator = v.object({
  key: v.string(),
  label: v.string(),
});

export const clozeGapValidator = v.object({
  key: v.string(),
  options: v.array(assessmentOptionValidator),
});

export const clozeAnswerValidator = v.object({
  gapKey: v.string(),
  choiceKey: v.string(),
});

const assessmentItemBaseValidator = v.object({
  versionId: v.id("assessmentVersions"),
  sectionId: v.id("assessmentSections"),
  stimulusId: v.optional(v.id("assessmentStimuli")),
  sourceContentVersionId: v.optional(v.id("siteContentVersions")),
  itemKey: v.string(),
  order: v.number(),
  prompt: v.string(),
  required: v.boolean(),
  explanation: v.optional(v.string()),
  provenanceJson: v.string(),
  authoredBy: v.id("adminUsers"),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const assessmentItemValidator = v.union(
  assessmentItemBaseValidator.extend({
    type: v.literal("single-choice"),
    options: v.array(assessmentOptionValidator),
  }),
  assessmentItemBaseValidator.extend({
    type: v.literal("multiple-select"),
    options: v.array(assessmentOptionValidator),
    selectionMin: v.number(),
    selectionMax: v.number(),
  }),
  assessmentItemBaseValidator.extend({
    type: v.literal("cloze-select"),
    stemParts: v.array(v.string()),
    gaps: v.array(clozeGapValidator),
  }),
  assessmentItemBaseValidator.extend({
    type: v.literal("sentence-build"),
    tokens: v.array(assessmentOptionValidator),
  }),
  assessmentItemBaseValidator.extend({
    type: v.literal("constructed-response"),
    responseMode: constructedResponseModeValidator,
    minimumWords: v.number(),
    recommendedWords: v.number(),
    maximumCharacters: v.number(),
    preparationSeconds: v.optional(v.number()),
    responseSeconds: v.optional(v.number()),
  }),
);

const assessmentAnswerKeyBaseValidator = v.object({
  versionId: v.id("assessmentVersions"),
  itemId: v.id("assessmentItems"),
  scoringMode: answerScoringModeValidator,
  points: v.optional(v.number()),
});

export const assessmentAnswerKeyValidator = v.union(
  assessmentAnswerKeyBaseValidator.extend({
    kind: v.literal("choice"),
    correctChoiceKeys: v.array(v.string()),
  }),
  assessmentAnswerKeyBaseValidator.extend({
    kind: v.literal("multi-choice"),
    correctChoiceKeys: v.array(v.string()),
  }),
  assessmentAnswerKeyBaseValidator.extend({
    kind: v.literal("cloze"),
    correctGapAnswers: v.array(clozeAnswerValidator),
  }),
  assessmentAnswerKeyBaseValidator.extend({
    kind: v.literal("token-order"),
    acceptedTokenOrders: v.array(v.array(v.string())),
  }),
  assessmentAnswerKeyBaseValidator.extend({
    kind: v.literal("text-rubric"),
    rubricMode: constructedResponseModeValidator,
    maxPoints: v.number(),
    minimumWords: v.number(),
    targetTerms: v.array(v.string()),
    sampleResponse: v.string(),
  }),
);

export const assessmentResponseInputValidator = v.union(
  v.object({
    kind: v.literal("choice"),
    selectedChoiceKey: v.optional(v.string()),
  }),
  v.object({
    kind: v.literal("multi-choice"),
    selectedChoiceKeys: v.array(v.string()),
  }),
  v.object({
    kind: v.literal("cloze"),
    gapAnswers: v.array(clozeAnswerValidator),
  }),
  v.object({
    kind: v.literal("token-order"),
    tokenOrder: v.array(v.string()),
  }),
  v.object({
    kind: v.literal("text"),
    text: v.string(),
  }),
);

const assessmentResponseBaseValidator = v.object({
  attemptId: v.id("assessmentAttempts"),
  versionId: v.id("assessmentVersions"),
  sectionId: v.id("assessmentSections"),
  itemId: v.id("assessmentItems"),
  clientRevision: v.number(),
  lastMutationId: v.string(),
  flagged: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const assessmentResponseValidator = v.union(
  assessmentResponseBaseValidator.extend({
    kind: v.literal("choice"),
    selectedChoiceKey: v.optional(v.string()),
  }),
  assessmentResponseBaseValidator.extend({
    kind: v.literal("multi-choice"),
    selectedChoiceKeys: v.array(v.string()),
  }),
  assessmentResponseBaseValidator.extend({
    kind: v.literal("cloze"),
    gapAnswers: v.array(clozeAnswerValidator),
  }),
  assessmentResponseBaseValidator.extend({
    kind: v.literal("token-order"),
    tokenOrder: v.array(v.string()),
  }),
  assessmentResponseBaseValidator.extend({
    kind: v.literal("text"),
    text: v.string(),
  }),
);

export const publicAssessmentItemValidator = v.union(
  v.object({
    id: v.id("assessmentItems"),
    type: v.literal("single-choice"),
    prompt: v.string(),
    required: v.boolean(),
    options: v.array(assessmentOptionValidator),
  }),
  v.object({
    id: v.id("assessmentItems"),
    type: v.literal("multiple-select"),
    prompt: v.string(),
    required: v.boolean(),
    options: v.array(assessmentOptionValidator),
    selectionMin: v.number(),
    selectionMax: v.number(),
  }),
  v.object({
    id: v.id("assessmentItems"),
    type: v.literal("cloze-select"),
    prompt: v.string(),
    required: v.boolean(),
    stemParts: v.array(v.string()),
    gaps: v.array(clozeGapValidator),
  }),
  v.object({
    id: v.id("assessmentItems"),
    type: v.literal("sentence-build"),
    prompt: v.string(),
    required: v.boolean(),
    tokens: v.array(assessmentOptionValidator),
  }),
  v.object({
    id: v.id("assessmentItems"),
    type: v.literal("constructed-response"),
    prompt: v.string(),
    required: v.boolean(),
    responseMode: constructedResponseModeValidator,
    minimumWords: v.number(),
    recommendedWords: v.number(),
    maximumCharacters: v.number(),
    preparationSeconds: v.union(v.number(), v.null()),
    responseSeconds: v.union(v.number(), v.null()),
  }),
);

export const publicAssessmentResponseValidator = assessmentResponseInputValidator;

export const assessmentCatalogCardValidator = v.object({
  slug: v.string(),
  kind: v.union(v.literal("full-practice"), v.literal("skill-quiz")),
  title: v.string(),
  summary: v.string(),
  skills: v.array(assessmentSkillValidator),
  timePolicy: timePolicyValidator,
  approximateMinutes: v.union(v.number(), v.null()),
  resultLabel: v.union(
    v.literal("Practice result"),
    v.literal("Feedback only"),
  ),
});

export const publicStimulusValidator = v.object({
  id: v.id("assessmentStimuli"),
  kind: stimulusKindValidator,
  title: v.union(v.string(), v.null()),
  body: v.union(v.string(), v.null()),
  mediaUrl: v.union(v.string(), v.null()),
  transcript: v.union(v.string(), v.null()),
  alt: v.union(v.string(), v.null()),
});

export const questionAudioValidator = v.object({
  mediaId: v.id("mediaAssets"),
  publicUrl: v.string(),
  contentType: v.string(),
  durationMs: v.number(),
  description: v.string(),
});

export const attemptPlayerValidator = v.object({
  attemptId: v.id("assessmentAttempts"),
  status: attemptStatusValidator,
  timingMode: timingModeValidator,
  listeningMode: listeningModeValidator,
  sectionDeadlineAt: v.union(v.number(), v.null()),
  saveStateVersion: v.number(),
  responseRevision: v.number(),
  section: v.object({
    id: v.id("assessmentSections"),
    title: v.string(),
    skill: assessmentSkillValidator,
    order: v.number(),
    totalSections: v.number(),
    instructions: v.string(),
  }),
  item: publicAssessmentItemValidator,
  illustration: v.union(
    v.object({
      mediaId: v.id("mediaAssets"),
      publicUrl: v.string(),
      alt: v.string(),
      width: v.number(),
      height: v.number(),
    }),
    v.null(),
  ),
  audio: v.union(questionAudioValidator, v.null()),
  stimulus: v.union(publicStimulusValidator, v.null()),
  response: v.union(assessmentResponseInputValidator, v.null()),
  flagged: v.boolean(),
  itemStates: v.array(
    v.object({
      itemId: v.id("assessmentItems"),
      itemOrder: v.number(),
      answered: v.boolean(),
      flagged: v.boolean(),
      current: v.boolean(),
    }),
  ),
  navigation: v.object({
    itemOrder: v.number(),
    itemCount: v.number(),
    canGoBack: v.boolean(),
    canGoNext: v.boolean(),
  }),
});

export const attemptResultValidator = v.object({
  status: resultStatusValidator,
  kind: assessmentKindValidator,
  formTitle: v.string(),
  completedAt: v.number(),
  resultRevision: v.number(),
  timingMode: timingModeValidator,
  listeningMode: listeningModeValidator,
  label: v.union(
    v.literal("Practice result"),
    v.literal("Extended-time practice result"),
    v.literal("Untimed practice result"),
    v.literal("Transcript-supported practice result"),
  ),
  objective: v.object({
    correct: v.number(),
    possible: v.number(),
    omitted: v.number(),
  }),
  weighted: v.object({
    earned: v.number(),
    possible: v.number(),
  }),
  estimate: v.union(
    v.object({
      model: v.literal("ec-ibt-style-v1"),
      overallBand: v.union(v.number(), v.null()),
      comparableTotal: v.union(v.number(), v.null()),
      confidence: scoreConfidenceValidator,
    }),
    v.object({
      model: v.literal("ec-paper-linear-v1"),
      total: v.number(),
      minimum: v.literal(310),
      maximum: v.literal(677),
      method: v.literal("fixed-linear"),
      confidence: v.literal("low"),
    }),
    v.null(),
  ),
  sections: v.array(
    v.object({
      order: v.number(),
      skill: assessmentSkillValidator,
      title: v.string(),
      correct: v.number(),
      possible: v.number(),
      answered: v.number(),
      items: v.number(),
      elapsedSeconds: v.number(),
      earnedPoints: v.number(),
      possiblePoints: v.number(),
      bandEstimate: v.union(v.number(), v.null()),
      comparableScoreEstimate: v.union(v.number(), v.null()),
      confidence: v.union(scoreConfidenceValidator, v.null()),
      paperSectionEstimate: v.union(v.number(), v.null()),
    }),
  ),
  disclaimer: v.string(),
});
