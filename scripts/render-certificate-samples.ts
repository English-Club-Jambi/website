import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { PDFDocument } from "pdf-lib";

import type {
  CertificateTemplateKey,
  FullPracticeCertificateInput,
} from "../content/full-practice-delivery";
import { generateFullPracticeCertificate } from "../convex/lib/fullPracticeCertificate";

const templateKeys = [
  "mendalo-record",
  "cobalt-selvedge",
  "titik-folio",
] as const satisfies ReadonlyArray<CertificateTemplateKey>;

const sample = {
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
  templateKey: "mendalo-record",
} satisfies FullPracticeCertificateInput;

const proof = await PDFDocument.create({ updateMetadata: false });
for (const templateKey of templateKeys) {
  const pageBytes = await generateFullPracticeCertificate({
    ...sample,
    templateKey,
  });
  const source = await PDFDocument.load(pageBytes, { updateMetadata: false });
  const [page] = await proof.copyPages(source, [0]);
  if (page) proof.addPage(page);
  console.log(`${templateKey}: ${pageBytes.byteLength} bytes`);
}

proof.setTitle("English Club Full Practice certificate template proof");
proof.setAuthor("English Club");
proof.setSubject("QA proof for three practice completion certificate designs");
proof.setLanguage("en");
const stableDate = new Date(sample.completedAt);
proof.setCreationDate(stableDate);
proof.setModificationDate(stableDate);

const outputDirectory = join(process.cwd(), "output", "pdf");
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  join(outputDirectory, "full-practice-certificate-templates.pdf"),
  await proof.save({ useObjectStreams: false }),
);
