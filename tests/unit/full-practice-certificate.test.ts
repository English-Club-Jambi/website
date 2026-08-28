import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
  fullPracticeDeliveryCopy,
  type FullPracticeCertificateInput,
} from "@content/full-practice-delivery";
import {
  generateFullPracticeCertificate,
  getCertificateFilename,
} from "../../convex/lib/fullPracticeCertificate";

const input = {
  recipientName: "Jose Alvarez",
  completedAt: Date.parse("2026-08-28T01:30:00.000Z"),
  timingMode: "standard",
  listeningMode: "audio-primary",
  rawCorrect: 102,
  rawPossible: 140,
  omitted: 3,
  elapsedSeconds: 6_900,
  paperEstimate: 512,
  sections: [
    { label: "Listening", correct: 36, possible: 50, omitted: 1 },
    { label: "Structure", correct: 28, possible: 40, omitted: 1 },
    { label: "Reading", correct: 38, possible: 50, omitted: 1 },
  ],
  resultRevision: 1,
  publicCertificateId: "EC-2026-QA7F9K2",
  templateKey: "mendalo-record",
} satisfies FullPracticeCertificateInput;

const privateReviewUrl =
  "https://english-club.example/practice/review/qa-private-token-never-in-certificate";

describe("Full Practice certificate PDF", () => {
  it("renders every design as a one-page A4 landscape PDF with stable metadata", async () => {
    const designs = ["mendalo-record", "cobalt-selvedge", "titik-folio"] as const;
    const outputs = await Promise.all(
      designs.map((templateKey) =>
        generateFullPracticeCertificate({ ...input, templateKey }),
      ),
    );

    for (const bytes of outputs) {
      expect(bytes.byteLength).toBeGreaterThan(3_000);
      expect(bytes.byteLength).toBeLessThan(100_000);
      const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
      expect(pdf.getPageCount()).toBe(1);
      const { width, height } = pdf.getPage(0).getSize();
      expect(width).toBeCloseTo(841.8898, 2);
      expect(height).toBeCloseTo(595.2756, 2);
      expect(pdf.getTitle()).toBe(
        "Jose Alvarez | English Club Full Practice completion record",
      );
      expect(pdf.getAuthor()).toBe("English Club");
      expect(pdf.getSubject()?.toLowerCase()).toContain("practice completion");
      expect(pdf.getPage(0).node.Annots()?.size() ?? 0).toBe(0);
    }

    expect(Buffer.compare(Buffer.from(outputs[0]), Buffer.from(outputs[1]))).not.toBe(0);
    expect(Buffer.compare(Buffer.from(outputs[1]), Buffer.from(outputs[2]))).not.toBe(0);
  });

  it("returns byte-identical output for identical result data", async () => {
    const first = await generateFullPracticeCertificate(input);
    const second = await generateFullPracticeCertificate(input);
    expect(Buffer.compare(Buffer.from(first), Buffer.from(second))).toBe(0);
  });

  it("supports common Latin diacritics without changing the learner name", async () => {
    const bytes = await generateFullPracticeCertificate({
      ...input,
      recipientName: "Jos\u00e9 \u00c1lvarez",
    });
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(pdf.getTitle()).toContain("Jos\u00e9 \u00c1lvarez");
  });

  it("does not accept or carry a private review URL in bytes, metadata, or annotations", async () => {
    const compileTimeCertificateInput: FullPracticeCertificateInput = {
      ...input,
      // @ts-expect-error The private bearer URL belongs to email, never a certificate input.
      reviewUrl: privateReviewUrl,
    };
    const bytes = await generateFullPracticeCertificate(
      compileTimeCertificateInput,
    );
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    const rawPdf = new TextDecoder("latin1").decode(bytes);
    const metadata = [
      pdf.getTitle(),
      pdf.getAuthor(),
      pdf.getSubject(),
      pdf.getKeywords(),
      pdf.getCreator(),
      pdf.getProducer(),
    ]
      .filter((value): value is string => typeof value === "string")
      .join("\n");

    expect(rawPdf).not.toContain("qa-private-token-never-in-certificate");
    expect(rawPdf).not.toContain("/practice/review/");
    expect(metadata).not.toContain("qa-private-token-never-in-certificate");
    expect(metadata).not.toContain("/practice/review/");
    expect(pdf.getPage(0).node.Annots()?.size() ?? 0).toBe(0);
  });

  it("describes the printed name as participant-supplied and unverified", () => {
    expect(fullPracticeDeliveryCopy.certificateNameContext).toBe(
      "Practice record prepared for",
    );
    expect(fullPracticeDeliveryCopy.certificateIdentityNotice).toBe(
      "Name supplied by participant; identity not verified.",
    );
    expect(fullPracticeDeliveryCopy.certificateNameContext).not.toContain(
      "confirms that",
    );
  });

  it("renders a balanced two-line name and the raw-result fallback", async () => {
    const bytes = await generateFullPracticeCertificate({
      ...input,
      recipientName:
        "Alya Nur Rahman Putri Mendalo English Conversation Practice",
      paperEstimate: null,
    });
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toContain("Alya Nur Rahman");
  });

  it("fails clearly instead of corrupting a name the standard font cannot encode", async () => {
    await expect(
      generateFullPracticeCertificate({ ...input, recipientName: "Siti Li" }),
    ).resolves.toBeInstanceOf(Uint8Array);
    await expect(
      generateFullPracticeCertificate({ ...input, recipientName: "Siti \u674e" }),
    ).rejects.toMatchObject({
      code: "CERTIFICATE_NAME_UNSUPPORTED",
    });
  });

  it("rejects a name that cannot fit at the minimum approved size", async () => {
    await expect(
      generateFullPracticeCertificate({
        ...input,
        recipientName: "W".repeat(80),
      }),
    ).rejects.toMatchObject({
      code: "CERTIFICATE_NAME_TOO_LONG",
    });
  });

  it("keeps private identity out of the attachment filename", () => {
    expect(getCertificateFilename(input.publicCertificateId)).toBe(
      "english-club-full-practice-EC-2026-QA7F9K2.pdf",
    );
    expect(getCertificateFilename(input.publicCertificateId)).not.toContain(
      input.recipientName,
    );
  });
});
