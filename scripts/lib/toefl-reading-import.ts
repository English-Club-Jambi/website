export type ReadingImportQuestion = {
  id: string;
  number: number;
  prompt: string;
  options: Array<{ key: string; label: string }>;
  correctChoiceKey: string;
  explanation: string;
};

export type ReadingImportSection = {
  topic: {
    id: string;
    title: string;
    sourceFile: string;
  };
  section: {
    id: string;
    number: number;
    title: string;
    sourcePages: number[];
  };
  passage: {
    id: string;
    title: string;
    sourcePages: number[];
    paragraphs: Array<{
      id: string;
      order: number;
      label: string;
      text: string;
    }>;
  };
  questions: ReadingImportQuestion[];
};

export type ToeflReadingImportPlan = {
  sections: ReadingImportSection[];
  topics: number;
  passages: number;
  questions: number;
  sourceQuestions: number;
  excluded: Array<{ key: string; reason: string }>;
};

type JsonRecord = Record<string, unknown>;

function fail(message: string): never {
  throw new Error(`TOEFL Reading dataset is invalid: ${message}`);
}

function record(value: unknown, label: string): JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object.`);
  }
  return value as JsonRecord;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) fail(`${label} must be an array.`);
  return value;
}

function text(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} must be a non-empty string.`);
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    fail(`${label} contains unsupported control characters.`);
  }
  return value.trim().replace(/\r\n/g, "\n");
}

function integer(value: unknown, label: string) {
  if (!Number.isInteger(value) || (value as number) < 1) {
    fail(`${label} must be a positive integer.`);
  }
  return value as number;
}

function pages(value: unknown, label: string) {
  const result = array(value, label).map((entry, index) =>
    integer(entry, `${label}[${index}]`),
  );
  if (result.length === 0 || new Set(result).size !== result.length) {
    fail(`${label} must contain unique page numbers.`);
  }
  return result;
}

function extractTopicData(html: string) {
  const match = html.match(
    /<script[^>]*\bid=["']topicData["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (match === null) fail("the topicData JSON script was not found.");
  try {
    return JSON.parse(match[1]) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown JSON error";
    fail(`topicData is not valid JSON (${detail}).`);
  }
}

export function parseToeflReadingHtml(html: string): ToeflReadingImportPlan {
  const root = extractTopicData(html);
  const topicValues = Array.isArray(root)
    ? root
    : Object.entries(record(root, "topicData"))
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, value]) => value);
  if (topicValues.length === 0 || topicValues.length > 100) {
    fail("topicData must contain between 1 and 100 topics.");
  }

  const sections: ReadingImportSection[] = [];
  const topicIds = new Set<string>();
  const bankKeys = new Set<string>();
  const canonicalQuestions = new Set<string>();
  const excluded: Array<{ key: string; reason: string }> = [];
  let expectedQuestions = 0;

  for (let topicIndex = 0; topicIndex < topicValues.length; topicIndex += 1) {
    const topic = record(topicValues[topicIndex], `topics[${topicIndex}]`);
    const topicId = text(topic.id, `topics[${topicIndex}].id`);
    if (topicIds.has(topicId)) fail(`duplicate topic id ${topicId}.`);
    topicIds.add(topicId);
    const data = record(topic.data, `topics[${topicIndex}].data`);
    const metadata = record(data.metadata, `topics[${topicIndex}].data.metadata`);
    const topicTitle = text(
      topic.title ?? metadata.title,
      `topics[${topicIndex}].title`,
    );
    const sourceFile = text(
      metadata.source_file,
      `topics[${topicIndex}].data.metadata.source_file`,
    );
    const sourceSections = array(
      data.sections,
      `topics[${topicIndex}].data.sections`,
    );
    const metadataSectionCount = integer(
      metadata.total_sections,
      `topics[${topicIndex}].data.metadata.total_sections`,
    );
    const metadataQuestionCount = integer(
      metadata.total_questions,
      `topics[${topicIndex}].data.metadata.total_questions`,
    );
    if (sourceSections.length !== metadataSectionCount) {
      fail(`${topicId} section count does not match its metadata.`);
    }
    let topicQuestionCount = 0;

    for (let sectionIndex = 0; sectionIndex < sourceSections.length; sectionIndex += 1) {
      const sourceSection = record(
        sourceSections[sectionIndex],
        `${topicId}.sections[${sectionIndex}]`,
      );
      const sectionId = text(
        sourceSection.id,
        `${topicId}.sections[${sectionIndex}].id`,
      );
      const sectionNumber = integer(
        sourceSection.number,
        `${topicId}.${sectionId}.number`,
      );
      const sectionTitle = text(
        sourceSection.title,
        `${topicId}.${sectionId}.title`,
      );
      const sectionPages = pages(
        sourceSection.source_pages,
        `${topicId}.${sectionId}.source_pages`,
      );
      const sourcePassage = record(
        sourceSection.passage,
        `${topicId}.${sectionId}.passage`,
      );
      const passageId = text(
        sourcePassage.id,
        `${topicId}.${sectionId}.passage.id`,
      );
      const sourceParagraphs = array(
        sourcePassage.paragraphs,
        `${topicId}.${sectionId}.passage.paragraphs`,
      );
      const paragraphs = sourceParagraphs.map((value, paragraphIndex) => {
        const paragraph = record(
          value,
          `${topicId}.${sectionId}.paragraphs[${paragraphIndex}]`,
        );
        const order = integer(
          paragraph.order,
          `${topicId}.${sectionId}.paragraphs[${paragraphIndex}].order`,
        );
        if (order !== paragraphIndex + 1) {
          fail(`${topicId}/${sectionId} paragraph order is not contiguous.`);
        }
        return {
          id: text(
            paragraph.id,
            `${topicId}.${sectionId}.paragraphs[${paragraphIndex}].id`,
          ),
          order,
          label: text(
            paragraph.label,
            `${topicId}.${sectionId}.paragraphs[${paragraphIndex}].label`,
          ),
          text: text(
            paragraph.text,
            `${topicId}.${sectionId}.paragraphs[${paragraphIndex}].text`,
          ),
        };
      });
      if (
        paragraphs.length === 0 ||
        new Set(paragraphs.map((paragraph) => paragraph.id)).size !==
          paragraphs.length
      ) {
        fail(`${topicId}/${sectionId} has invalid passage paragraphs.`);
      }

      const sourceQuestions = array(
        sourceSection.questions,
        `${topicId}.${sectionId}.questions`,
      );
      if (sourceQuestions.length === 0 || sourceQuestions.length > 20) {
        fail(`${topicId}/${sectionId} must contain between 1 and 20 questions.`);
      }
      const questions = sourceQuestions.map((value, questionIndex) => {
        const question = record(
          value,
          `${topicId}.${sectionId}.questions[${questionIndex}]`,
        );
        if (question.type !== "single_choice") {
          fail(`${topicId}/${sectionId} contains a non-single-choice question.`);
        }
        if (question.passage_id !== passageId) {
          fail(`${topicId}/${sectionId} contains a question linked to another passage.`);
        }
        const questionId = text(
          question.id,
          `${topicId}.${sectionId}.questions[${questionIndex}].id`,
        );
        const sourceOptions = array(
          question.options,
          `${topicId}.${sectionId}.${questionId}.options`,
        );
        if (sourceOptions.length < 2 || sourceOptions.length > 8) {
          fail(`${topicId}/${sectionId}/${questionId} has an invalid option count.`);
        }
        if (
          sourceOptions.some((optionValue) => {
            const option = record(
              optionValue,
              `${topicId}.${sectionId}.${questionId}.options`,
            );
            return typeof option.text !== "string" || option.text.trim().length === 0;
          })
        ) {
          excluded.push({
            key: `${topicId}/${sectionId}/${questionId}`,
            reason: "one or more answer choices are empty in the source",
          });
          return null;
        }
        const options = sourceOptions.map((optionValue, optionIndex) => {
          const option = record(
            optionValue,
            `${topicId}.${sectionId}.${questionId}.options[${optionIndex}]`,
          );
          return {
            key: text(
              option.key,
              `${topicId}.${sectionId}.${questionId}.options[${optionIndex}].key`,
            ).toLowerCase(),
            label: text(
              option.text,
              `${topicId}.${sectionId}.${questionId}.options[${optionIndex}].text`,
            ),
          };
        });
        if (
          new Set(options.map((option) => option.key)).size !== options.length ||
          new Set(options.map((option) => option.label.toLowerCase())).size !==
            options.length
        ) {
          fail(`${topicId}/${sectionId}/${questionId} has duplicate options.`);
        }
        const correctAnswer = record(
          question.correct_answer,
          `${topicId}.${sectionId}.${questionId}.correct_answer`,
        );
        const correctChoiceKey = text(
          correctAnswer.option_key,
          `${topicId}.${sectionId}.${questionId}.correct_answer.option_key`,
        ).toLowerCase();
        if (!options.some((option) => option.key === correctChoiceKey)) {
          fail(`${topicId}/${sectionId}/${questionId} answer is not in its options.`);
        }
        const explanationRecord = record(
          question.explanation,
          `${topicId}.${sectionId}.${questionId}.explanation`,
        );
        const prompt = text(
          question.prompt,
          `${topicId}.${sectionId}.${questionId}.prompt`,
        );
        const bankKey = `${topicId}/${sectionId}/${questionId}`;
        if (bankKeys.has(bankKey)) fail(`duplicate question key ${bankKey}.`);
        bankKeys.add(bankKey);
        const canonical = [
          prompt.toLowerCase().replace(/\s+/g, " "),
          ...options.map((option) => option.label.toLowerCase().replace(/\s+/g, " ")),
        ].join("\u001f");
        if (canonicalQuestions.has(canonical)) {
          fail(`duplicate question content at ${bankKey}.`);
        }
        canonicalQuestions.add(canonical);
        return {
          id: questionId,
          number: integer(
            question.number,
            `${topicId}.${sectionId}.${questionId}.number`,
          ),
          prompt,
          options,
          correctChoiceKey,
          explanation: text(
            explanationRecord.content,
            `${topicId}.${sectionId}.${questionId}.explanation.content`,
          ),
        };
      }).filter((question): question is ReadingImportQuestion => question !== null);
      topicQuestionCount += sourceQuestions.length;
      if (questions.length === 0) {
        fail(`${topicId}/${sectionId} has no usable questions after validation.`);
      }
      sections.push({
        topic: { id: topicId, title: topicTitle, sourceFile },
        section: {
          id: sectionId,
          number: sectionNumber,
          title: sectionTitle,
          sourcePages: sectionPages,
        },
        passage: {
          id: passageId,
          title: text(
            sourcePassage.title,
            `${topicId}.${sectionId}.passage.title`,
          ),
          sourcePages: pages(
            sourcePassage.source_pages,
            `${topicId}.${sectionId}.passage.source_pages`,
          ),
          paragraphs,
        },
        questions,
      });
    }
    if (topicQuestionCount !== metadataQuestionCount) {
      fail(`${topicId} question count does not match its metadata.`);
    }
    expectedQuestions += metadataQuestionCount;
  }

  const questions = sections.reduce(
    (total, section) => total + section.questions.length,
    0,
  );
  if (questions + excluded.length !== expectedQuestions) {
    fail("the total question count does not match topic metadata.");
  }
  return {
    sections,
    topics: topicIds.size,
    passages: sections.length,
    questions,
    sourceQuestions: expectedQuestions,
    excluded,
  };
}
