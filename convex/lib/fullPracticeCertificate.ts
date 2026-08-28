import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  beginMarkedContent,
  endMarkedContent,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";

import { geistRegularBase64 } from "../assets/geistRegularBase64";
import {
  formatFullPracticeCompletionDate,
  formatFullPracticeElapsed,
  formatFullPracticeModes,
  fullPracticeDeliveryCopy,
  getCertificateTemplate,
  isCertificateTemplateKey,
  type CertificateTemplateKey,
  type FullPracticeCertificateInput,
} from "../../content/full-practice-delivery";

const A4_LANDSCAPE = [841.8898, 595.2756] as const;
const POINTS_PER_MM = 72 / 25.4;
const TEXT_EDGE = 22 * POINTS_PER_MM;

const palette = {
  sheet: hex("#ffffff"),
  chalk: hex("#fbfaf6"),
  ink: hex("#0c111d"),
  muted: hex("#545b69"),
  line: hex("#cbd1dd"),
  cobalt: hex("#2b29b5"),
  wash: hex("#e3eaff"),
  signal: hex("#ef6505"),
};

export class CertificateArtifactError extends Error {
  readonly code:
    | "CERTIFICATE_INPUT_INVALID"
    | "CERTIFICATE_NAME_UNSUPPORTED"
    | "CERTIFICATE_NAME_TOO_LONG";

  constructor(
    code: CertificateArtifactError["code"],
    message: string,
  ) {
    super(message);
    this.name = "CertificateArtifactError";
    this.code = code;
  }
}

type FontSet = {
  body: PDFFont;
  bodyBold: PDFFont;
  display: PDFFont;
  displayBold: PDFFont;
};

type NameLayout = {
  lines: ReadonlyArray<string>;
  size: number;
};

type CertificateText = {
  completedDate: string;
  mode: string;
  scoreLabel: string;
  scoreValue: string;
  resultDetail: string;
};

export function getCertificateFilename(publicCertificateId: string): string {
  assertCertificateId(publicCertificateId);
  return `english-club-full-practice-${publicCertificateId}.pdf`;
}

export async function generateFullPracticeCertificate(
  input: FullPracticeCertificateInput,
): Promise<Uint8Array> {
  assertArtifactInput(input);
  const document = await PDFDocument.create({ updateMetadata: false });
  document.registerFontkit(fontkit);
  const page = document.addPage([A4_LANDSCAPE[0], A4_LANDSCAPE[1]]);
  const geist = await document.embedFont(base64ToBytes(geistRegularBase64), {
    subset: true,
    customName: "Geist",
  });
  const fonts: FontSet = {
    body: geist,
    bodyBold: geist,
    display: geist,
    displayBold: geist,
  };

  assertFontSupport(fonts, input.recipientName);
  const template = getCertificateTemplate(input.templateKey);
  const completedDate = formatFullPracticeCompletionDate(input.completedAt);
  const elapsed = formatFullPracticeElapsed(input.elapsedSeconds);
  const mode = formatFullPracticeModes(input);
  const text: CertificateText = {
    completedDate,
    mode,
    scoreLabel:
      input.paperEstimate === null
        ? "Result on this form"
        : "English Club practice estimate",
    scoreValue:
      input.paperEstimate === null
        ? `${input.rawCorrect} of ${input.rawPossible} correct`
        : String(input.paperEstimate),
    resultDetail: `${input.rawCorrect} of ${input.rawPossible} correct / ${input.omitted} omitted / ${elapsed}`,
  };

  document.setTitle(
    `${input.recipientName} | English Club Full Practice completion record`,
    { showInWindowTitleBar: true },
  );
  document.setAuthor("English Club");
  document.setSubject("English Club Full Practice completion record");
  document.setKeywords([
    "English Club",
    "Full Practice",
    "practice completion",
  ]);
  document.setCreator("English Club result delivery");
  document.setProducer("English Club result delivery");
  document.setLanguage("en");
  const stableDate = new Date(input.completedAt);
  document.setCreationDate(stableDate);
  document.setModificationDate(stableDate);

  if (template.key === "mendalo-record") {
    drawMendaloRecord(page, fonts, input, text);
  } else if (template.key === "cobalt-selvedge") {
    drawCobaltSelvedge(page, fonts, input, text);
  } else {
    drawTitikFolio(page, fonts, input, text);
  }

  return document.save({ useObjectStreams: false });
}

function drawMendaloRecord(
  page: PDFPage,
  fonts: FontSet,
  input: FullPracticeCertificateInput,
  text: CertificateText,
) {
  const { width, height } = page.getSize();
  drawArtifact(page, () => {
    page.drawRectangle({ x: 0, y: 0, width, height, color: palette.sheet });
    page.drawLine({
      start: { x: TEXT_EDGE, y: height - 88 },
      end: { x: width - TEXT_EDGE, y: height - 88 },
      thickness: 1,
      color: palette.line,
    });
    page.drawRectangle({
      x: TEXT_EDGE,
      y: 176,
      width: width - TEXT_EDGE * 2,
      height: 34,
      color: palette.wash,
    });
    drawDotLinePattern(page, {
      x: TEXT_EDGE + 9,
      y: 181,
      width: width - TEXT_EDGE * 2 - 18,
      height: 24,
      color: palette.cobalt,
      opacity: 0.42,
    });
    page.drawRectangle({
      x: width - 75,
      y: height - 49,
      width: 17,
      height: 17,
      color: palette.signal,
    });
  });

  drawIssuerAndTitle(page, fonts, {
    issuerX: TEXT_EDGE,
    issuerY: height - 67,
    titleX: width - 87,
    titleY: height - 68,
    titleAlign: "right",
  });
  drawCoreCertificate(page, fonts, input, text, {
    x: TEXT_EDGE,
    maxNameWidth: 500,
    statementY: 435,
    nameY: 386,
    completionY: 315,
    scoreX: 622,
    scoreY: 300,
    resultY: 250,
    limitationX: TEXT_EDGE,
    limitationY: 130,
    limitationWidth: 570,
    issuerY: 86,
    metadataY: 51,
    recordX: 622,
  });
}

function drawCobaltSelvedge(
  page: PDFPage,
  fonts: FontSet,
  input: FullPracticeCertificateInput,
  text: CertificateText,
) {
  const { width, height } = page.getSize();
  const railWidth = 136;
  drawArtifact(page, () => {
    page.drawRectangle({ x: 0, y: 0, width, height, color: palette.sheet });
    page.drawRectangle({
      x: 0,
      y: 0,
      width: railWidth,
      height,
      color: palette.cobalt,
    });
    drawDotLinePattern(page, {
      x: 24,
      y: 88,
      width: 88,
      height: 372,
      color: palette.sheet,
      opacity: 0.18,
      vertical: true,
    });
    page.drawCircle({ x: 183, y: 281, size: 5, color: palette.signal });
    page.drawLine({
      start: { x: 166, y: 159 },
      end: { x: width - TEXT_EDGE, y: 159 },
      thickness: 1,
      color: palette.line,
    });
  });

  page.drawText("English Club", {
    x: 24,
    y: height - 62,
    size: 12,
    font: fonts.bodyBold,
    color: palette.sheet,
  });
  page.drawText("Certificate of practice", {
    x: 166,
    y: height - 62,
    size: 24,
    font: fonts.displayBold,
    color: palette.ink,
  });
  page.drawText("completion", {
    x: 166,
    y: height - 87,
    size: 24,
    font: fonts.displayBold,
    color: palette.ink,
  });
  page.drawText(`Issued ${text.completedDate}`, {
    x: 24,
    y: 60,
    size: 8.5,
    font: fonts.body,
    color: palette.sheet,
  });
  page.drawText("Certificate ID", {
    x: 24,
    y: 43,
    size: 8.5,
    font: fonts.body,
    color: palette.sheet,
  });
  page.drawText(input.publicCertificateId, {
    x: 24,
    y: 28,
    size: 8,
    font: fonts.body,
    color: palette.sheet,
  });

  drawCoreCertificate(page, fonts, input, text, {
    x: 183,
    maxNameWidth: width - 183 - TEXT_EDGE,
    statementY: 436,
    nameY: 386,
    completionY: 315,
    scoreX: 183,
    scoreY: 260,
    resultY: 210,
    limitationX: 166,
    limitationY: 125,
    limitationWidth: width - 166 - TEXT_EDGE,
    issuerY: 83,
    metadataY: 51,
    recordX: 650,
    completedCue: true,
    metadataInRail: true,
  });
}

function drawTitikFolio(
  page: PDFPage,
  fonts: FontSet,
  input: FullPracticeCertificateInput,
  text: CertificateText,
) {
  const { width, height } = page.getSize();
  drawArtifact(page, () => {
    page.drawRectangle({ x: 0, y: 0, width, height, color: palette.chalk });
    page.drawRectangle({
      x: 12 * POINTS_PER_MM,
      y: 12 * POINTS_PER_MM,
      width: width - 24 * POINTS_PER_MM,
      height: height - 24 * POINTS_PER_MM,
      borderColor: palette.ink,
      borderWidth: 0.75,
    });
    drawDotLinePattern(page, {
      x: width - 164,
      y: height - 112,
      width: 102,
      height: 55,
      color: palette.cobalt,
      opacity: 0.52,
    });
    drawDotLinePattern(page, {
      x: 58,
      y: 48,
      width: 102,
      height: 55,
      color: palette.cobalt,
      opacity: 0.52,
    });
    page.drawLine({
      start: { x: 180, y: 247 },
      end: { x: width - 180, y: 247 },
      thickness: 1.5,
      color: palette.cobalt,
    });
    page.drawRectangle({ x: 181, y: 77, width: 8, height: 8, color: palette.signal });
  });

  drawCenteredText(page, "English Club", fonts.bodyBold, 11, height - 66, palette.cobalt);
  drawCenteredText(
    page,
    "Certificate of practice completion",
    fonts.displayBold,
    24,
    height - 103,
    palette.ink,
  );

  drawCoreCertificate(page, fonts, input, text, {
    x: 180,
    maxNameWidth: width - 360,
    statementY: 434,
    nameY: 383,
    completionY: 311,
    scoreX: width / 2,
    scoreY: 225,
    resultY: 181,
    limitationX: 180,
    limitationY: 128,
    limitationWidth: width - 360,
    issuerY: 80,
    metadataY: 53,
    recordX: width - 270,
    centered: true,
  });
}

function drawIssuerAndTitle(
  page: PDFPage,
  fonts: FontSet,
  args: {
    issuerX: number;
    issuerY: number;
    titleX: number;
    titleY: number;
    titleAlign: "right";
  },
) {
  page.drawText("English Club", {
    x: args.issuerX,
    y: args.issuerY,
    size: 12,
    font: fonts.bodyBold,
    color: palette.cobalt,
  });
  drawAlignedText(
    page,
    "Certificate of practice completion",
    fonts.displayBold,
    24,
    args.titleX,
    args.titleY,
    palette.ink,
    args.titleAlign,
  );
}

function drawCoreCertificate(
  page: PDFPage,
  fonts: FontSet,
  input: FullPracticeCertificateInput,
  text: CertificateText,
  layout: {
    x: number;
    maxNameWidth: number;
    statementY: number;
    nameY: number;
    completionY: number;
    scoreX: number;
    scoreY: number;
    resultY: number;
    limitationX: number;
    limitationY: number;
    limitationWidth: number;
    issuerY: number;
    metadataY: number;
    recordX: number;
    centered?: boolean;
    completedCue?: boolean;
    metadataInRail?: boolean;
  },
) {
  const nameLayout = layoutRecipientName(
    fonts.displayBold,
    input.recipientName,
    layout.maxNameWidth,
  );
  const statement = fullPracticeDeliveryCopy.certificateNameContext;
  if (layout.centered) {
    drawCenteredText(page, statement, fonts.body, 11, layout.statementY, palette.muted);
  } else {
    page.drawText(statement, {
      x: layout.x,
      y: layout.statementY,
      size: 11,
      font: fonts.body,
      color: palette.muted,
    });
  }

  nameLayout.lines.forEach((line, index) => {
    const y = layout.nameY - index * (nameLayout.size + 2);
    if (layout.centered) {
      drawCenteredText(page, line, fonts.displayBold, nameLayout.size, y, palette.ink);
    } else {
      page.drawText(line, {
        x: layout.x,
        y,
        size: nameLayout.size,
        font: fonts.displayBold,
        color: palette.ink,
      });
    }
  });

  const nameFlowOffset = (nameLayout.lines.length - 1) * 28;
  const lastNameY =
    layout.nameY - (nameLayout.lines.length - 1) * (nameLayout.size + 2);
  const identityNoticeY = lastNameY - 18;
  const completionY = layout.completionY - nameFlowOffset;
  const scoreY = layout.scoreY - nameFlowOffset;
  const resultY = layout.resultY - nameFlowOffset;
  if (layout.centered) {
    drawCenteredText(
      page,
      fullPracticeDeliveryCopy.certificateIdentityNotice,
      fonts.body,
      8.5,
      identityNoticeY,
      palette.muted,
    );
  } else {
    page.drawText(fullPracticeDeliveryCopy.certificateIdentityNotice, {
      x: layout.x,
      y: identityNoticeY,
      size: 8.5,
      font: fonts.body,
      color: palette.muted,
    });
  }

  const completionLines = [
    "completed English Club Full Practice",
    `on ${text.completedDate} in ${text.mode}.`,
  ];
  completionLines.forEach((line, index) => {
    if (layout.centered) {
      drawCenteredText(
        page,
        line,
        index === 0 ? fonts.bodyBold : fonts.body,
        12,
        completionY - index * 18,
        palette.ink,
      );
    } else {
      page.drawText(line, {
        x: layout.x,
        y: completionY - index * 18,
        size: 12,
        font: index === 0 ? fonts.bodyBold : fonts.body,
        color: palette.ink,
      });
    }
  });

  if (layout.completedCue) {
    page.drawText("Completed", {
      x: layout.x + 14,
      y: completionY - 38,
      size: 9,
      font: fonts.bodyBold,
      color: palette.ink,
    });
  }

  if (layout.centered) {
    drawCenteredText(page, text.scoreLabel, fonts.bodyBold, 10, scoreY, palette.muted);
    drawCenteredText(
      page,
      text.scoreValue,
      fonts.displayBold,
      input.paperEstimate === null ? 20 : 27,
      scoreY - 32,
      palette.cobalt,
    );
    drawCenteredText(page, text.resultDetail, fonts.body, 10, resultY, palette.ink);
  } else {
    page.drawText(text.scoreLabel, {
      x: layout.scoreX,
      y: scoreY,
      size: 10,
      font: fonts.bodyBold,
      color: palette.muted,
    });
    page.drawText(text.scoreValue, {
      x: layout.scoreX,
      y: scoreY - 34,
      size: input.paperEstimate === null ? 20 : 27,
      font: fonts.displayBold,
      color: palette.cobalt,
    });
    page.drawText(text.resultDetail, {
      x: layout.x,
      y: resultY,
      size: 10,
      font: fonts.body,
      color: palette.ink,
    });
  }

  const limitationLines = wrapText(
    fonts.body,
    fullPracticeDeliveryCopy.certificateLimitation,
    9.5,
    layout.limitationWidth,
  );
  limitationLines.forEach((line, index) => {
    const y = layout.limitationY - index * 13;
    if (layout.centered) {
      drawCenteredText(page, line, fonts.body, 9.5, y, palette.muted);
    } else {
      page.drawText(line, {
        x: layout.limitationX,
        y,
        size: 9.5,
        font: fonts.body,
        color: palette.muted,
      });
    }
  });

  const issuerX = layout.centered ? 196 : layout.x;
  page.drawText("Issued by English Club", {
    x: issuerX,
    y: layout.issuerY,
    size: 9,
    font: fonts.bodyBold,
    color: palette.ink,
  });
  page.drawText("English Club UPT Perpustakaan Universitas Jambi", {
    x: issuerX,
    y: layout.issuerY - 15,
    size: 8.5,
    font: fonts.body,
    color: palette.muted,
  });

  if (!layout.metadataInRail) {
    page.drawText(`Certificate ID ${input.publicCertificateId}`, {
      x: layout.x,
      y: layout.metadataY,
      size: 8.5,
      font: fonts.body,
      color: palette.muted,
    });
  }
  page.drawText(`Record revision ${input.resultRevision}`, {
    x: layout.recordX,
    y: layout.metadataY,
    size: 8.5,
    font: fonts.body,
    color: palette.muted,
  });
}

function layoutRecipientName(
  font: PDFFont,
  name: string,
  maxWidth: number,
): NameLayout {
  for (let size = 42; size >= 26; size -= 2) {
    if (font.widthOfTextAtSize(name, size) <= maxWidth) {
      return { lines: [name], size };
    }
  }

  const words = name.split(/\s+/u);
  if (words.length < 2) {
    throw new CertificateArtifactError(
      "CERTIFICATE_NAME_TOO_LONG",
      "The certificate name does not fit. Shorten the name and try again.",
    );
  }

  const candidates = Array.from({ length: words.length - 1 }, (_, index) => {
    const first = words.slice(0, index + 1).join(" ");
    const second = words.slice(index + 1).join(" ");
    return { first, second };
  }).sort((a, b) => Math.abs(a.first.length - a.second.length) - Math.abs(b.first.length - b.second.length));

  for (let size = 40; size >= 26; size -= 2) {
    const candidate = candidates.find(
      ({ first, second }) =>
        font.widthOfTextAtSize(first, size) <= maxWidth &&
        font.widthOfTextAtSize(second, size) <= maxWidth,
    );
    if (candidate) {
      return { lines: [candidate.first, candidate.second], size };
    }
  }

  throw new CertificateArtifactError(
    "CERTIFICATE_NAME_TOO_LONG",
    "The certificate name does not fit on two lines. Shorten the name and try again.",
  );
}

function drawDotLinePattern(
  page: PDFPage,
  args: {
    x: number;
    y: number;
    width: number;
    height: number;
    color: RGB;
    opacity: number;
    vertical?: boolean;
  },
) {
  const patternUnit = 8 * POINTS_PER_MM;
  const columns = Math.max(1, Math.floor(args.width / patternUnit));
  const rows = Math.max(1, Math.floor(args.height / patternUnit));
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const baseX = args.x + column * patternUnit + patternUnit / 2;
      const baseY = args.y + row * patternUnit + patternUnit / 2;
      const direction = (row + column) % 4;
      const length = 6.4;
      const dx = direction === 0 ? length : direction === 2 ? -length : 0;
      const dy = direction === 1 ? length : direction === 3 ? -length : 0;
      const swapX = args.vertical ? dy : dx;
      const swapY = args.vertical ? dx : dy;
      page.drawCircle({
        x: baseX,
        y: baseY,
        size: 1,
        color: args.color,
        opacity: args.opacity,
      });
      page.drawLine({
        start: { x: baseX + swapX * 0.35, y: baseY + swapY * 0.35 },
        end: { x: baseX + swapX, y: baseY + swapY },
        thickness: 1.55,
        color: args.color,
        opacity: args.opacity,
      });
    }
  }
}

function drawArtifact(page: PDFPage, draw: () => void) {
  page.pushOperators(beginMarkedContent("Artifact"));
  draw();
  page.pushOperators(endMarkedContent());
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  y: number,
  color: RGB,
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (page.getWidth() - width) / 2,
    y,
    size,
    font,
    color,
  });
}

function drawAlignedText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  x: number,
  y: number,
  color: RGB,
  align: "right",
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: align === "right" ? x - width : x,
    y,
    size,
    font,
    color,
  });
}

function wrapText(
  font: PDFFont,
  text: string,
  size: number,
  maxWidth: number,
): ReadonlyArray<string> {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/u)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function assertArtifactInput(input: FullPracticeCertificateInput) {
  const recipientName = input.recipientName.trim();
  const canonicalName = recipientName.replace(/\s+/gu, " ");
  if (
    recipientName.length < 2 ||
    recipientName.length > 80 ||
    recipientName !== input.recipientName ||
    canonicalName !== input.recipientName
  ) {
    throw new CertificateArtifactError(
      "CERTIFICATE_INPUT_INVALID",
      "Enter the certificate name without leading or trailing spaces. Use 2 to 80 characters.",
    );
  }
  if (!isCertificateTemplateKey(input.templateKey)) {
    throw new CertificateArtifactError(
      "CERTIFICATE_INPUT_INVALID",
      "Choose an available certificate design.",
    );
  }
  assertCertificateId(input.publicCertificateId);
  assertInteger(input.rawCorrect, "correct answers", 0);
  assertInteger(input.rawPossible, "possible answers", 1);
  assertInteger(input.omitted, "omitted answers", 0);
  assertInteger(input.elapsedSeconds, "elapsed time", 0);
  assertInteger(input.resultRevision, "result revision", 1);
  if (
    input.rawCorrect > input.rawPossible ||
    input.omitted > input.rawPossible ||
    input.rawCorrect + input.omitted > input.rawPossible
  ) {
    throw new CertificateArtifactError(
      "CERTIFICATE_INPUT_INVALID",
      "The practice result totals are invalid.",
    );
  }
  if (
    input.paperEstimate !== null &&
    (!Number.isInteger(input.paperEstimate) ||
      input.paperEstimate < 310 ||
      input.paperEstimate > 677)
  ) {
    throw new CertificateArtifactError(
      "CERTIFICATE_INPUT_INVALID",
      "The practice estimate is invalid.",
    );
  }
  if (!Number.isFinite(input.completedAt) || input.completedAt <= 0) {
    throw new CertificateArtifactError(
      "CERTIFICATE_INPUT_INVALID",
      "The completion date is invalid.",
    );
  }
}

function assertFontSupport(fonts: FontSet, recipientName: string) {
  if (
    !Array.from(recipientName).every((character) =>
      /[\p{Script=Latin}\p{Mark}\p{Separator}'.\-\u2019]/u.test(character),
    )
  ) {
    throw new CertificateArtifactError(
      "CERTIFICATE_NAME_UNSUPPORTED",
      "This certificate design cannot typeset one or more characters in the name yet. Use Latin letters and common diacritics, or contact English Club for help.",
    );
  }
  try {
    fonts.displayBold.encodeText(recipientName);
  } catch {
    throw new CertificateArtifactError(
      "CERTIFICATE_NAME_UNSUPPORTED",
      "This certificate design cannot typeset one or more characters in the name yet. Use Latin letters and common diacritics, or contact English Club for help.",
    );
  }
}

function assertCertificateId(value: string) {
  if (!/^[A-Za-z0-9-]{8,64}$/u.test(value)) {
    throw new CertificateArtifactError(
      "CERTIFICATE_INPUT_INVALID",
      "The certificate ID is invalid.",
    );
  }
}

function assertInteger(value: number, label: string, minimum: number) {
  if (!Number.isInteger(value) || value < minimum) {
    throw new CertificateArtifactError(
      "CERTIFICATE_INPUT_INVALID",
      `The ${label} value is invalid.`,
    );
  }
}

function hex(value: `#${string}`): RGB {
  const red = Number.parseInt(value.slice(1, 3), 16) / 255;
  const green = Number.parseInt(value.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(value.slice(5, 7), 16) / 255;
  return rgb(red, green, blue);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export type { CertificateTemplateKey, FullPracticeCertificateInput };
