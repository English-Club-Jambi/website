import { describe, expect, it } from "vitest";

import { parseToeflReadingHtml } from "../../scripts/lib/toefl-reading-import";

function datasetHtml(options?: { invalidAnswer?: boolean }) {
  const data = {
    0: {
      id: "science",
      title: "Science",
      data: {
        metadata: {
          title: "Science",
          source_file: "Science.pdf",
          total_sections: 1,
          total_questions: 2,
        },
        sections: [
          {
            id: "section_01_wetlands",
            number: 1,
            title: "Wetlands",
            source_pages: [1, 2],
            passage: {
              id: "passage_01",
              title: "Wetlands",
              source_pages: [1, 2],
              paragraphs: [
                {
                  id: "passage_01_p01",
                  order: 1,
                  label: "Paragraph 1",
                  text: "Wetlands hold water and support many species.",
                },
              ],
            },
            questions: [
              {
                id: "q_1",
                number: 1,
                type: "single_choice",
                passage_id: "passage_01",
                prompt: "What is the passage mainly about?",
                options: [
                  { key: "a", text: "Wetland functions" },
                  { key: "b", text: "Desert travel" },
                ],
                correct_answer: {
                  option_key: options?.invalidAnswer ? "c" : "a",
                },
                explanation: { content: "The paragraph describes wetland functions." },
              },
              {
                id: "q_2",
                number: 2,
                type: "single_choice",
                passage_id: "passage_01",
                prompt: "Which answer choice is missing in the source?",
                options: [
                  { key: "a", text: "" },
                  { key: "b", text: "A complete choice" },
                ],
                correct_answer: { option_key: "b" },
                explanation: { content: "The source did not provide every choice." },
              },
            ],
          },
        ],
      },
    },
  };
  return `<html><script type="application/json" id="topicData">${JSON.stringify(data)}</script></html>`;
}

describe("TOEFL Reading import parser", () => {
  it("preserves passage relationships and excludes a source question with empty choices", () => {
    const plan = parseToeflReadingHtml(datasetHtml());

    expect(plan).toMatchObject({
      topics: 1,
      passages: 1,
      sourceQuestions: 2,
      questions: 1,
      excluded: [
        {
          key: "science/section_01_wetlands/q_2",
          reason: "one or more answer choices are empty in the source",
        },
      ],
    });
    expect(plan.sections[0].passage.paragraphs[0].text).toContain("Wetlands");
    expect(plan.sections[0].questions[0]).toMatchObject({
      id: "q_1",
      correctChoiceKey: "a",
      options: [
        { key: "a", label: "Wetland functions" },
        { key: "b", label: "Desert travel" },
      ],
    });
  });

  it("rejects an answer key that is absent from the choices", () => {
    expect(() => parseToeflReadingHtml(datasetHtml({ invalidAnswer: true }))).toThrow(
      /answer is not in its options/,
    );
  });
});
