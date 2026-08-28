import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

type ReferenceQuestion = {
  id: string;
  dependency_role: "anchor" | "follow-up";
  parent_question_id: string | null;
  parent_media_id: string;
  replay_media_id: string | null;
  answer: {
    kind: "choice" | "matrix";
    correct_option_key?: string;
    correct_row_keys_for_emdr?: string[];
  };
};

type ReferenceSet = {
  id: string;
  parent_media_id: string;
  anchor_question_id: string;
  question_count: number;
  questions: ReferenceQuestion[];
};

type ReferenceRecap = {
  dataset: {
    content_mode: string;
    question_count: number;
    set_count: number;
    media_count: number;
  };
  rights: {
    copied_question_text: boolean;
    copied_option_text: boolean;
    copied_media: boolean;
    public_seed_allowed: boolean;
    requires_rights_review: boolean;
  };
  delivery_contract: {
    anchor_required: boolean;
    follow_up_sampling_allowed: boolean;
    all_follow_ups_required: boolean;
    selected_members_contiguous: boolean;
  };
  media: Array<{ id: string; ingestion_allowed: boolean }>;
  sets: ReferenceSet[];
};

function loadRecap() {
  return JSON.parse(
    readFileSync(
      join(
        process.cwd(),
        "docs/data/toefl-listening-reference-recap.json",
      ),
      "utf8",
    ),
  ) as ReferenceRecap;
}

describe("Listening reference recap", () => {
  it("records the complete source topology without granting seed rights", () => {
    const recap = loadRecap();
    expect(recap.dataset).toMatchObject({
      content_mode: "paraphrased-reference-only",
      question_count: 11,
      set_count: 2,
      media_count: 5,
    });
    expect(recap.rights).toEqual(
      expect.objectContaining({
        copied_question_text: false,
        copied_option_text: false,
        copied_media: false,
        public_seed_allowed: false,
        requires_rights_review: true,
      }),
    );
    expect(recap.media.every((media) => !media.ingestion_allowed)).toBe(true);
  });

  it("requires an anchor while allowing a bounded subset of follow-ups", () => {
    const recap = loadRecap();
    expect(recap.delivery_contract).toMatchObject({
      anchor_required: true,
      follow_up_sampling_allowed: true,
      all_follow_ups_required: false,
      selected_members_contiguous: true,
    });

    for (const set of recap.sets) {
      expect(set.questions).toHaveLength(set.question_count);
      const anchors = set.questions.filter(
        (question) => question.dependency_role === "anchor",
      );
      expect(anchors).toHaveLength(1);
      expect(anchors[0]?.id).toBe(set.anchor_question_id);
      expect(anchors[0]?.parent_question_id).toBeNull();
      for (const question of set.questions) {
        expect(question.parent_media_id).toBe(set.parent_media_id);
        if (question.dependency_role === "follow-up") {
          expect(question.parent_question_id).toBe(set.anchor_question_id);
        }
      }
    }
  });

  it("resolves every replay reference and preserves every answer key", () => {
    const recap = loadRecap();
    const mediaIds = new Set(recap.media.map((media) => media.id));
    const questions = recap.sets.flatMap((set) => set.questions);
    const replayQuestions = questions.filter(
      (question) => question.replay_media_id !== null,
    );
    expect(replayQuestions).toHaveLength(3);
    for (const question of replayQuestions) {
      expect(mediaIds.has(question.replay_media_id!)).toBe(true);
    }
    for (const question of questions) {
      if (question.answer.kind === "choice") {
        expect(question.answer.correct_option_key).toMatch(/^[A-D]$/);
      } else {
        expect(question.answer.correct_row_keys_for_emdr).toEqual(["B", "C"]);
      }
    }
  });
});
