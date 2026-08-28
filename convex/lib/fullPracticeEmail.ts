import {
  formatFullPracticeCompletionDate,
  formatFullPracticeElapsed,
  formatFullPracticeModes,
  fullPracticeDeliveryCopy,
  getCertificateTemplate,
  type FullPracticeEmailInput,
} from "../../content/full-practice-delivery";
import { getCertificateFilename } from "./fullPracticeCertificate";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const deliveryReferencePattern = /^[A-Za-z0-9-]{8,64}$/u;
const MAX_CERTIFICATE_ATTACHMENT_BYTES = 2 * 1024 * 1024;

export type FullPracticeEmail = {
  subject: string;
  preheader: string;
  htmlContent: string;
  textContent: string;
  certificateFilename: string;
};

export type BrevoTransactionalEmailPayload = {
  sender: { email: string; name: string };
  to: ReadonlyArray<{
    email: string;
    name: string;
    contactPixelTrackingConsent: false;
  }>;
  replyTo?: { email: string; name?: string };
  headers: Readonly<{
    idempotencyKey: string;
    "X-Ec-Delivery": string;
  }>;
  subject: string;
  htmlContent: string;
  textContent: string;
  attachment: ReadonlyArray<{ name: string; content: string }>;
  tags: ReadonlyArray<string>;
};

export type BrevoTransactionalRequest = {
  endpoint: "https://api.brevo.com/v3/smtp/email";
  headers: Readonly<Record<string, string>>;
  body: string;
};

export function buildFullPracticeEmail(
  input: FullPracticeEmailInput,
): FullPracticeEmail {
  const template = getCertificateTemplate(input.templateKey);
  const completedDate = formatFullPracticeCompletionDate(input.completedAt);
  const elapsed = formatFullPracticeElapsed(input.elapsedSeconds);
  const mode = formatFullPracticeModes(input);
  const reviewUrl = requireHttpsUrl(input.reviewUrl, "private review link");
  const certificateFilename = getCertificateFilename(input.publicCertificateId);
  const resultHeading =
    input.paperEstimate === null
      ? `${input.rawCorrect} of ${input.rawPossible} correct`
      : String(input.paperEstimate);
  const resultLabel =
    input.paperEstimate === null
      ? "Result on this form"
      : "English Club practice estimate";
  const resultLimitation =
    input.paperEstimate === null
      ? "This raw result describes this attempt. It is not an official ETS score, proof of English proficiency, or admission evidence."
      : "This estimate describes this attempt. It is not an official ETS score, proof of English proficiency, or admission evidence.";
  const resultDetail = `${input.rawCorrect} of ${input.rawPossible} correct / ${input.omitted} omitted / ${elapsed} / ${mode}`;
  const sectionRows = input.sections
    .map(
      (section) =>
        `${section.label}: ${section.correct} of ${section.possible} correct, ${section.omitted} omitted`,
    )
    .join("\n");
  const preheader =
    "Your completion record, practice result, and private review link.";
  const subject = "Your English Club Full Practice result";

  const textContent = [
    "Your practice record is ready.",
    "",
    `${input.recipientName}, you completed English Club Full Practice on ${completedDate}.`,
    "",
    resultLabel,
    resultHeading,
    resultDetail,
    ...(sectionRows ? ["", sectionRows] : []),
    "",
    resultLimitation,
    "",
    `Your ${template.name} completion certificate is attached as ${certificateFilename}.`,
    fullPracticeDeliveryCopy.certificateLimitation,
    "",
    "Open full review",
    reviewUrl.toString(),
    "",
    fullPracticeDeliveryCopy.emailPrivacyWarning,
    "",
    "Issued by English Club UPT Perpustakaan Universitas Jambi.",
  ].join("\n");

  const htmlSections = input.sections
    .map(
      (section) => `
        <tr>
          <td style="padding:10px 0;border-top:1px solid #cbd1dd;font-size:14px;line-height:1.45;color:#545b69;">${escapeHtml(section.label)}</td>
          <td align="right" style="padding:10px 0;border-top:1px solid #cbd1dd;font-size:14px;line-height:1.45;color:#0c111d;font-weight:700;white-space:nowrap;">${section.correct} / ${section.possible}</td>
        </tr>`,
    )
    .join("");
  const safeReviewUrl = escapeHtml(reviewUrl.toString());
  const safeRecipientName = escapeHtml(input.recipientName);

  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6fb;color:#0c111d;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f6fb;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #cbd1dd;">
            <tr>
              <td style="padding:24px 28px;border-bottom:4px solid #2b29b5;">
                <div style="font-size:16px;line-height:1.25;font-weight:700;color:#2b29b5;">English Club</div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 28px 18px;">
                <h1 style="margin:0 0 16px;font-size:30px;line-height:1.12;color:#0c111d;">Your practice record is ready.</h1>
                <p style="margin:0;font-size:17px;line-height:1.6;color:#545b69;">${safeRecipientName}, you completed English Club Full Practice on ${escapeHtml(completedDate)}.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#e3eaff;">
                  <tr>
                    <td style="padding:22px 24px;">
                      <div style="font-size:13px;line-height:1.4;font-weight:700;color:#545b69;">${escapeHtml(resultLabel)}</div>
                      <div style="margin-top:4px;font-size:38px;line-height:1;font-weight:700;color:#2b29b5;">${escapeHtml(resultHeading)}</div>
                      <div style="margin-top:12px;font-size:14px;line-height:1.55;color:#0c111d;">${escapeHtml(resultDetail)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${
              htmlSections
                ? `<tr><td style="padding:0 28px 26px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;"><tr><td colspan="2" style="padding:0 0 8px;font-size:13px;line-height:1.4;font-weight:700;color:#0c111d;">Section detail</td></tr>${htmlSections}</table></td></tr>`
                : ""
            }
            <tr>
              <td style="padding:0 28px 28px;">
                <p style="margin:0;padding:16px 0;border-top:1px solid #cbd1dd;border-bottom:1px solid #cbd1dd;font-size:14px;line-height:1.55;color:#545b69;">${escapeHtml(resultLimitation)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <p style="margin:0 0 10px;font-size:15px;line-height:1.55;color:#0c111d;">Your <strong>${escapeHtml(template.name)}</strong> completion certificate is attached as a PDF.</p>
                <p style="margin:0 0 18px;font-size:13px;line-height:1.55;color:#545b69;">${escapeHtml(fullPracticeDeliveryCopy.certificateLimitation)}</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="background:#ef6505;border:1px solid #0c111d;">
                      <a href="${safeReviewUrl}" style="display:inline-block;padding:14px 20px;font-size:15px;line-height:1.2;font-weight:700;color:#0c111d;text-decoration:none;">Open full review</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0;font-size:13px;line-height:1.55;color:#545b69;">${escapeHtml(fullPracticeDeliveryCopy.emailPrivacyWarning)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#fbfaf6;border-top:1px solid #cbd1dd;font-size:12px;line-height:1.55;color:#545b69;">
                Issued by English Club UPT Perpustakaan Universitas Jambi.<br>
                Certificate ID ${escapeHtml(input.publicCertificateId)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject,
    preheader,
    htmlContent,
    textContent,
    certificateFilename,
  };
}

export function buildBrevoTransactionalPayload(args: {
  email: FullPracticeEmail;
  attachmentPdfBytes: Uint8Array;
  recipientEmail: string;
  recipientName: string;
  senderEmail: string;
  senderName: string;
  replyToEmail?: string;
  idempotencyKey: string;
  deliveryReference: string;
}): BrevoTransactionalEmailPayload {
  const recipientEmail = requireEmail(args.recipientEmail, "recipient email");
  const senderEmail = requireEmail(args.senderEmail, "sender email");
  const senderName = requirePlainName(args.senderName, "sender name");
  const recipientName = requirePlainName(args.recipientName, "recipient name");
  if (args.attachmentPdfBytes.byteLength === 0) {
    throw new Error("The certificate PDF is empty.");
  }
  if (args.attachmentPdfBytes.byteLength > MAX_CERTIFICATE_ATTACHMENT_BYTES) {
    throw new Error("The certificate PDF exceeds the 2 MiB attachment limit.");
  }
  const idempotencyKey = requireUuid(
    args.idempotencyKey,
    "Brevo idempotency key",
  );
  const deliveryReference = args.deliveryReference.trim();
  if (!deliveryReferencePattern.test(deliveryReference)) {
    throw new Error("The delivery reference is invalid.");
  }
  const replyToEmail = args.replyToEmail
    ? requireEmail(args.replyToEmail, "reply-to email")
    : undefined;

  return {
    sender: { email: senderEmail, name: senderName },
    to: [
      {
        email: recipientEmail,
        name: recipientName,
        contactPixelTrackingConsent: false,
      },
    ],
    ...(replyToEmail ? { replyTo: { email: replyToEmail } } : {}),
    headers: {
      idempotencyKey,
      "X-Ec-Delivery": deliveryReference,
    },
    subject: args.email.subject,
    htmlContent: args.email.htmlContent,
    textContent: args.email.textContent,
    attachment: [
      {
        name: args.email.certificateFilename,
        content: bytesToBase64(args.attachmentPdfBytes),
      },
    ],
    tags: ["full-practice-result"],
  };
}

export function buildBrevoTransactionalRequest(args: {
  apiKey: string;
  payload: BrevoTransactionalEmailPayload;
}): BrevoTransactionalRequest {
  const apiKey = args.apiKey.trim();
  if (!apiKey) {
    throw new Error("Brevo API key is not configured.");
  }
  requireUuid(args.payload.headers.idempotencyKey, "Brevo idempotency key");
  return {
    endpoint: "https://api.brevo.com/v3/smtp/email",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(args.payload),
  };
}

function requireUuid(value: string, label: string): string {
  const uuid = value.trim().toLowerCase();
  if (!uuidPattern.test(uuid)) {
    throw new Error(`The ${label} must be a UUID.`);
  }
  return uuid;
}

function requireHttpsUrl(value: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`The ${label} is invalid.`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`The ${label} must use HTTPS.`);
  }
  return url;
}

function requireEmail(value: string, label: string): string {
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > 254 || !emailPattern.test(email)) {
    throw new Error(`The ${label} is invalid.`);
  }
  return email;
}

function requirePlainName(value: string, label: string): string {
  const name = value.trim();
  if (name.length < 2 || name.length > 100) {
    throw new Error(`The ${label} is invalid.`);
  }
  return name;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/gu,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}
