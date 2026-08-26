# Paper-based practice research

Date: 26 August 2026

## Decision

English Club Assessment Lab will use a three-section paper-based practice form:

1. Listening Comprehension
2. Structure and Written Expression
3. Reading Comprehension

Speaking is not part of the new full practice. Quick practice will use the same three skill boundaries. Existing four-skill attempts and results remain readable as historical records, but they will not be offered for new attempts.

The public product will describe its result as an **English Club paper-based practice estimate**. It will not call the result an official TOEFL score, an exact prediction, or an ETS-equated score.

## Primary evidence

### ETS TOEFL ITP Level 1 content

Source: [ETS TOEFL ITP test content](https://www.ets.org/toefl/itp/test-content.html)

ETS lists the Level 1 paper-delivered form as:

| Section | Questions | Time | ETS section range |
| --- | ---: | ---: | ---: |
| Listening Comprehension | 50 | 35 minutes | 31–68 |
| Structure and Written Expression | 40 | 25 minutes | 31–68 |
| Reading Comprehension | 50 | 55 minutes | 31–67 |
| Total | 140 | 115 minutes | 310–677 |

Observation: ETS describes Speaking as a separate digital-only test. It is not one of the three Level 1 paper sections.

### ETS scoring rules

Sources:

- [TOEFL ITP Test Taker Handbook](https://www.ets.org/pdfs/toefl-itp-test-taker-handbook.pdf)
- [ETS TOEFL ITP scoring](https://www.ets.org/toefl/itp/scoring.html)

Evidence recorded from the handbook:

- One point is awarded for each correct answer.
- There is no penalty for an incorrect answer.
- Raw correct counts are converted to scaled section scores.
- ETS uses statistical equating and item response theory to account for differences between test forms.
- The official total is calculated from the three scaled section scores: `(Listening + Structure + Reading) × 10 ÷ 3`.
- The handbook example uses section scores 48, 56, and 52: `(48 + 56 + 52) × 10 ÷ 3 = 520`.

## What ETS does not publish

ETS does not publish one universal raw-to-scaled conversion formula that can reproduce official results for any arbitrary form. The conversion is form-specific and statistically equated. A fixed percentage conversion therefore cannot be presented as an official TOEFL result.

This is the central product boundary. The English Club bank contains original questions and has not undergone ETS equating or independent psychometric calibration.

## English Club estimation contract

The application will use a deterministic, versioned estimator named `ec-paper-linear-v1`.

For a section with `rawCorrect` correct answers:

```text
Listening = 31 + round(rawCorrect / 50 × 37)   // 31–68
Structure = 31 + round(rawCorrect / 40 × 37)   // 31–68
Reading   = 31 + round(rawCorrect / 50 × 36)   // 31–67

Total = round((Listening + Structure + Reading) × 10 / 3)
Total is clamped to 310–677.
```

Properties:

- zero correct across all sections produces 310;
- a perfect form produces 677;
- every answer has equal weight within a section;
- unanswered and incorrect answers receive zero credit;
- the calculation is stable and can be reproduced from the immutable attempt manifest;
- the UI always shows raw correct counts next to the estimate;
- the result disclaimer explains that official ETS scoring uses form-specific equating and may differ.

This fixed linear conversion is a product decision, not an ETS rule. Its advantage is auditability. Its limitation is deliberately visible rather than hidden behind a false precision claim.

## Content boundaries

- Question counts, section order, timing, and high-level task structure may follow the public ETS format.
- No ETS question, passage, recording, answer key, or proprietary conversion table will be copied.
- Every seeded question will be original English Club content.
- Listening questions require reviewed audio before they become selectable.
- Structure questions are objective single-choice tasks covering sentence completion and written-expression error recognition.
- Reading and Listening keep their immutable question-bank selection manifests.

## Accessibility and operations

- Extended-time and untimed learning modes remain available; score calculation does not change with the timing accommodation.
- Listening transcript support remains an explicit learner choice and is recorded with the attempt.
- Audio remains keyboard-operable and includes an accessible description.
- Motion is not used to communicate score or correctness.
- Historical four-skill attempts stay immutable and use their original scoring model.

## Confidence

High confidence: section count, order, question counts, timing, scale endpoints, no-penalty rule, and official total formula are directly supported by ETS.

Low confidence for score comparability: the English Club estimator is intentionally not equated. It is suitable for practice feedback and internal progress comparison only.
