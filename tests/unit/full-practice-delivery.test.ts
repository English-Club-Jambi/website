import { describe, expect, it } from "vitest";

import {
  certificateTemplates,
  defaultCertificateTemplateKey,
  formatFullPracticeCompletionDate,
  formatFullPracticeElapsed,
  formatFullPracticeModes,
  fullPracticeDeliveryCopy,
  getCertificateTemplate,
  isCertificateTemplateKey,
  type FullPracticeEmailInput,
} from "@content/full-practice-delivery";
import {
  buildBrevoTransactionalPayload,
  buildBrevoTransactionalRequest,
  buildFullPracticeEmail,
} from "../../convex/lib/fullPracticeEmail";

const artifactInput = {
  recipientName: "Alya Rahman",
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
  reviewUrl: "https://english-club.example/practice/review/private-token",
  templateKey: "mendalo-record",
} satisfies FullPracticeEmailInput;

const providerAttemptId = "123e4567-e89b-42d3-a456-426614174000";
const deliveryReference = "EC-2026-QA7F9K2";

describe("Full Practice delivery contract", () => {
  it("keeps one stable default across three named designs", () => {
    expect(certificateTemplates).toHaveLength(3);
    expect(new Set(certificateTemplates.map((template) => template.key)).size).toBe(3);
    expect(
      certificateTemplates.filter((template) => template.isDefault).map((template) => template.key),
    ).toEqual([defaultCertificateTemplateKey]);
    expect(getCertificateTemplate("mendalo-record").name).toBe("Mendalo Record");
    expect(isCertificateTemplateKey("titik-folio")).toBe(true);
    expect(isCertificateTemplateKey("borrowed-diploma")).toBe(false);
  });

  it("formats completion facts without depending on the server locale", () => {
    expect(formatFullPracticeCompletionDate(artifactInput.completedAt)).toBe(
      "28 August 2026",
    );
    expect(formatFullPracticeElapsed(artifactInput.elapsedSeconds)).toBe("1:55:00");
    expect(
      formatFullPracticeModes({
        timingMode: "extended",
        listeningMode: "transcript-supported",
      }),
    ).toBe("Extended time / Transcript-supported practice");
  });

  it("uses completion language and rejects proficiency claims in shared copy", () => {
    expect(fullPracticeDeliveryCopy.certificateLimitation).toContain(
      "records completion",
    );
    expect(fullPracticeDeliveryCopy.certificateLimitation).toContain(
      "not an official ETS score",
    );
    expect(fullPracticeDeliveryCopy.certificateLimitation).not.toContain(
      "certified English proficiency",
    );
    expect(fullPracticeDeliveryCopy.certificateNameContext).toBe(
      "Practice record prepared for",
    );
    expect(fullPracticeDeliveryCopy.certificateIdentityNotice).toContain(
      "identity not verified",
    );
  });
});

describe("Full Practice result email", () => {
  it("carries the same result, limitation, attachment, and review link in HTML and text", () => {
    const email = buildFullPracticeEmail(artifactInput);

    expect(email.subject).toBe("Your English Club Full Practice result");
    expect(email.textContent).toContain("512");
    expect(email.textContent).toContain("102 of 140 correct");
    expect(email.textContent).toContain("Listening: 36 of 50 correct");
    expect(email.textContent).toContain("not an official ETS score");
    expect(email.textContent).toContain(artifactInput.reviewUrl);
    expect(email.textContent).toContain(email.certificateFilename);
    expect(email.htmlContent).toContain("512");
    expect(email.htmlContent).toContain("102 of 140 correct");
    expect(email.htmlContent).toContain("Section detail");
    expect(email.htmlContent).toContain("not an official ETS score");
    expect(email.htmlContent).toContain(artifactInput.reviewUrl);
    expect(email.htmlContent).not.toContain("Harvard");
  });

  it("escapes learner-controlled content before adding it to HTML", () => {
    const email = buildFullPracticeEmail({
      ...artifactInput,
      recipientName: "Alya <script>alert(1)</script>",
      sections: [
        {
          label: '<img src=x onerror="alert(1)">',
          correct: 1,
          possible: 1,
          omitted: 0,
        },
      ],
    });

    expect(email.htmlContent).not.toContain("<script>");
    expect(email.htmlContent).not.toContain("<img src=x");
    expect(email.htmlContent).toContain("&lt;script&gt;");
    expect(email.htmlContent).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("does not invent an estimate when the result has none", () => {
    const email = buildFullPracticeEmail({
      ...artifactInput,
      paperEstimate: null,
    });

    expect(email.textContent).toContain("Result on this form\n102 of 140 correct");
    expect(email.textContent).not.toContain("English Club practice estimate");
    expect(email.htmlContent).toContain("Result on this form");
  });

  it("uses the learner email as recipient and a separate club mailbox for replies", () => {
    const email = buildFullPracticeEmail(artifactInput);
    const payload = buildBrevoTransactionalPayload({
      email,
      attachmentPdfBytes: new Uint8Array([37, 80, 68, 70]),
      recipientEmail: "Learner@Example.com",
      recipientName: artifactInput.recipientName,
      senderEmail: "results@english-club.example",
      senderName: "English Club",
      replyToEmail: "hello@english-club.example",
      idempotencyKey: providerAttemptId,
      deliveryReference,
    });

    expect(payload.to).toEqual([
      {
        email: "learner@example.com",
        name: "Alya Rahman",
        contactPixelTrackingConsent: false,
      },
    ]);
    expect(payload.headers).toEqual({
      idempotencyKey: providerAttemptId,
      "X-Ec-Delivery": deliveryReference,
    });
    expect(payload.replyTo).toEqual({ email: "hello@english-club.example" });
    expect(payload.attachment[0]?.name).toBe(
      "english-club-full-practice-EC-2026-QA7F9K2.pdf",
    );
    expect(payload.attachment[0]?.name).not.toContain("Alya");
    expect(payload.attachment[0]?.content).toBe("JVBERg==");
  });

  it("places one UUID idempotency key in the Brevo JSON body, never the HTTP headers", () => {
    const email = buildFullPracticeEmail(artifactInput);
    const payload = buildBrevoTransactionalPayload({
      email,
      attachmentPdfBytes: new Uint8Array([37, 80, 68, 70]),
      recipientEmail: "learner@example.com",
      recipientName: artifactInput.recipientName,
      senderEmail: "results@english-club.example",
      senderName: "English Club",
      idempotencyKey: providerAttemptId,
      deliveryReference,
    });
    const request = buildBrevoTransactionalRequest({
      apiKey: "private-brevo-key",
      payload,
    });
    const body = JSON.parse(request.body) as {
      headers: Record<string, string>;
      to: ReadonlyArray<{ contactPixelTrackingConsent: boolean }>;
    };

    expect(request.endpoint).toBe("https://api.brevo.com/v3/smtp/email");
    expect(request.headers["api-key"]).toBe("private-brevo-key");
    expect(request.headers["Idempotency-Key"]).toBeUndefined();
    expect(body.headers.idempotencyKey).toBe(providerAttemptId);
    expect(
      Object.values(body.headers).filter((value) => value === providerAttemptId),
    ).toHaveLength(1);
    expect(body.to[0]?.contactPixelTrackingConsent).toBe(false);
    expect(request.body).not.toContain("private-brevo-key");
  });

  it("rejects a non-UUID Brevo idempotency key before serializing a request", () => {
    const email = buildFullPracticeEmail(artifactInput);

    expect(() =>
      buildBrevoTransactionalPayload({
        email,
        attachmentPdfBytes: new Uint8Array([37, 80, 68, 70]),
        recipientEmail: "learner@example.com",
        recipientName: artifactInput.recipientName,
        senderEmail: "results@english-club.example",
        senderName: "English Club",
        idempotencyKey: "result-delivery-8f3ab92d",
        deliveryReference,
      }),
    ).toThrow("must be a UUID");
  });

  it("accepts a 2 MiB certificate attachment and rejects one extra byte", () => {
    const email = buildFullPracticeEmail(artifactInput);
    const baseArgs = {
      email,
      recipientEmail: "learner@example.com",
      recipientName: artifactInput.recipientName,
      senderEmail: "results@english-club.example",
      senderName: "English Club",
      idempotencyKey: providerAttemptId,
      deliveryReference,
    };

    expect(() =>
      buildBrevoTransactionalPayload({
        ...baseArgs,
        attachmentPdfBytes: new Uint8Array(2 * 1024 * 1024),
      }),
    ).not.toThrow();
    expect(() =>
      buildBrevoTransactionalPayload({
        ...baseArgs,
        attachmentPdfBytes: new Uint8Array(2 * 1024 * 1024 + 1),
      }),
    ).toThrow("2 MiB attachment limit");
  });
});
