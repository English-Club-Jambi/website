export const certificateTemplateKeys = [
  "mendalo-record",
  "cobalt-selvedge",
  "titik-folio",
] as const;

export type CertificateTemplateKey =
  (typeof certificateTemplateKeys)[number];

export type CertificateTemplate = {
  key: CertificateTemplateKey;
  name: string;
  description: string;
  isDefault: boolean;
};

export type FullPracticeTimingMode = "standard" | "extended" | "untimed";

export type FullPracticeListeningMode =
  | "audio-primary"
  | "transcript-supported";

export type FullPracticeDeliverySection = {
  label: string;
  correct: number;
  possible: number;
  omitted: number;
};

export type FullPracticeCertificateInput = {
  recipientName: string;
  completedAt: number;
  timingMode: FullPracticeTimingMode;
  listeningMode: FullPracticeListeningMode;
  rawCorrect: number;
  rawPossible: number;
  omitted: number;
  elapsedSeconds: number;
  paperEstimate: number | null;
  sections: ReadonlyArray<FullPracticeDeliverySection>;
  resultRevision: number;
  publicCertificateId: string;
  templateKey: CertificateTemplateKey;
};

export type FullPracticeEmailInput = FullPracticeCertificateInput & {
  reviewUrl: string;
};

export const certificateTemplates = [
  {
    key: "mendalo-record",
    name: "Mendalo Record",
    description: "A formal cobalt record with a quiet batik line.",
    isDefault: true,
  },
  {
    key: "cobalt-selvedge",
    name: "Cobalt Selvedge",
    description: "A bold academic layout with a woven cobalt record rail.",
    isDefault: false,
  },
  {
    key: "titik-folio",
    name: "Titik Folio",
    description: "A quiet framed folio with batik-inspired corner notation.",
    isDefault: false,
  },
] as const satisfies ReadonlyArray<CertificateTemplate>;

export const defaultCertificateTemplateKey: CertificateTemplateKey =
  "mendalo-record";

export function isCertificateTemplateKey(
  value: unknown,
): value is CertificateTemplateKey {
  return (
    typeof value === "string" &&
    certificateTemplateKeys.some((key) => key === value)
  );
}

export function getCertificateTemplate(
  key: CertificateTemplateKey,
): CertificateTemplate {
  const template = certificateTemplates.find((candidate) => candidate.key === key);
  if (!template) {
    throw new Error(`Unknown certificate template: ${String(key)}`);
  }
  return template;
}

export function formatFullPracticeCompletionDate(completedAt: number): string {
  if (!Number.isFinite(completedAt) || completedAt <= 0) {
    throw new Error("Completion date is invalid.");
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(completedAt));
}

export function formatFullPracticeElapsed(elapsedSeconds: number): string {
  if (!Number.isInteger(elapsedSeconds) || elapsedSeconds < 0) {
    throw new Error("Elapsed time is invalid.");
  }
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatFullPracticeModes(args: {
  timingMode: FullPracticeTimingMode;
  listeningMode: FullPracticeListeningMode;
}): string {
  const timingLabel: Record<FullPracticeTimingMode, string> = {
    standard: "Standard timing",
    extended: "Extended time",
    untimed: "Untimed practice",
  };
  const labels = [timingLabel[args.timingMode]];
  if (args.listeningMode === "transcript-supported") {
    labels.push("Transcript-supported practice");
  }
  return labels.join(" / ");
}

export const fullPracticeDeliveryCopy = {
  triggerTitle: "Send my result by email",
  triggerBody:
    "Receive a result summary, completion certificate, and a private link to your full review.",
  designLabel: "Certificate design",
  defaultDesignSummary:
    "Mendalo Record is ready. A formal cobalt layout with a quiet batik line.",
  changeDesignAction: "Choose another design",
  submitAction: "Email my result",
  pendingAction: "Preparing your email...",
  successTitle: "Your result is on its way.",
  retryableError:
    "The email could not be sent. Your result is safe here. Check the address and try again.",
  certificateLimitation:
    "This certificate records completion of one English Club practice form. The participant entered the printed name, and English Club did not verify their identity. It is not an official ETS score, proof of English proficiency, or admission evidence.",
  certificateNameContext: "Practice record prepared for",
  certificateIdentityNotice:
    "Name supplied by participant; identity not verified.",
  emailPrivacyWarning:
    "This private link shows your answers and explanations. Do not forward it if you do not want other people to see your responses.",
} as const;
