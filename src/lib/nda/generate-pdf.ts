import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

export interface PdfPartyInfo {
  label: string;
  description: string;
  signatureName: string | null;
}

export interface PdfClauseInfo {
  title: string;
  body: string;
}

export interface GeneratePdfParams {
  effectiveDateText: string;
  parties: PdfPartyInfo[];
  clauses: PdfClauseInfo[];
}

const PAGE_WIDTH = 595.28; // A4, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 60;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TEXT_COLOR = rgb(0.13, 0.13, 0.13);

function wrapText(text: string, font: PDFFont, size: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > CONTENT_WIDTH && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Renders the same document a user sees on the preview screen into a PDF.
 * Kept deliberately simple (manual word-wrap, single-column signature
 * blocks) rather than pulling in a layout engine — pdf-lib has no text
 * flow of its own, so this hand-rolls just enough of one.
 */
export async function generateDocumentPdf(params: GeneratePdfParams): Promise<Uint8Array> {
  const { effectiveDateText, parties, clauses } = params;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle("Non-Disclosure Agreement");
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  let page: PDFPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function newPage() {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  function addParagraph(
    text: string,
    opts: {
      size?: number;
      bold?: boolean;
      lineHeight?: number;
      spacingAfter?: number;
      align?: "left" | "center";
    } = {}
  ) {
    const {
      size = 11,
      bold = false,
      lineHeight = 15,
      spacingAfter = 10,
      align = "left",
    } = opts;
    const useFont = bold ? boldFont : font;
    const lines = wrapText(text, useFont, size);

    for (const line of lines) {
      if (y - lineHeight < MARGIN) newPage();
      const width = useFont.widthOfTextAtSize(line, size);
      const x = align === "center" ? (PAGE_WIDTH - width) / 2 : MARGIN;
      page.drawText(line, { x, y: y - size, size, font: useFont, color: TEXT_COLOR });
      y -= lineHeight;
    }
    y -= spacingAfter;
  }

  addParagraph("NON-DISCLOSURE AGREEMENT", {
    size: 16,
    bold: true,
    lineHeight: 20,
    spacingAfter: 24,
    align: "center",
  });

  addParagraph(
    `This Non-Disclosure Agreement (the "Agreement") is made and entered into on ${effectiveDateText}, by and between:`
  );

  for (const party of parties) {
    addParagraph(`${party.label}: ${party.description}.`, { spacingAfter: 6 });
  }

  addParagraph(`(each a "Party" and, collectively, the "Parties").`, { spacingAfter: 20 });

  clauses.forEach((clause, index) => {
    addParagraph(`${index + 1}. ${clause.title}`, { bold: true, spacingAfter: 4 });
    addParagraph(clause.body, { spacingAfter: 16 });
  });

  addParagraph(
    "IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.",
    { spacingAfter: 30 }
  );

  for (const party of parties) {
    addParagraph(party.label, { bold: true, spacingAfter: 8 });
    addParagraph("Signature: ______________________________", { spacingAfter: 10 });
    addParagraph(`Name: ${party.signatureName ?? "________________________"}`, {
      spacingAfter: 10,
    });
    addParagraph("Date: ______________________________", { spacingAfter: 24 });
  }

  return pdfDoc.save();
}
