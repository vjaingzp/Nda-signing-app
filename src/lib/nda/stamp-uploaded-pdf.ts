import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createSignatureFontEmbedder } from "./signature-font-bytes";
import type { SignatureStyle } from "./signature-styles";

export interface StampPlacement {
  role: "uploader" | "counterparty";
  fieldType: "signature" | "date";
  pageNumber: number; // 1-indexed
  /** Normalized 0..1, relative to page width, measured from the left. */
  x: number;
  /** Normalized 0..1, relative to page height, measured from the top. */
  y: number;
  width: number;
  height: number;
}

export interface StampSignature {
  role: "uploader" | "counterparty";
  signerName: string;
  signedAt: string; // ISO timestamp
  signatureStyle: SignatureStyle;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Draws each party's typed signature (or the date they signed) into the
 * marked boxes on the original uploaded PDF. A placement whose party
 * never actually signed is left blank rather than guessed at — this only
 * runs once every party has signed anyway (see finalizeSignaturesIfComplete).
 */
export async function stampUploadedPdf(
  originalBytes: Uint8Array,
  placements: StampPlacement[],
  signatures: StampSignature[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const embedSignatureFont = createSignatureFontEmbedder(pdfDoc);
  const signatureByRole = new Map(signatures.map((s) => [s.role, s]));

  for (const placement of placements) {
    const pageIndex = placement.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) continue;

    const signature = signatureByRole.get(placement.role);
    if (!signature) continue;

    const isSignatureField = placement.fieldType === "signature";
    const text = isSignatureField ? signature.signerName : formatShortDate(signature.signedAt);

    const page = pdfDoc.getPage(pageIndex);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const boxLeft = placement.x * pageWidth;
    const boxWidth = placement.width * pageWidth;
    const boxHeight = placement.height * pageHeight;
    // placement.y is measured from the page's TOP; pdf-lib's origin is
    // bottom-left, so the box's bottom edge in pdf-lib space is the page
    // height minus the distance from the top to the box's bottom edge.
    const boxBottom = pageHeight - (placement.y + placement.height) * pageHeight;

    // Cursive signature fonts read better a bit larger than a plain date
    // stamp at the same box height, so the cap differs by field type.
    const fontSize = Math.max(8, Math.min(isSignatureField ? 20 : 14, boxHeight * 0.6));
    const textFont = isSignatureField ? await embedSignatureFont(signature.signatureStyle) : font;

    page.drawText(text, {
      x: boxLeft + 2,
      y: boxBottom + (boxHeight - fontSize) / 2,
      size: fontSize,
      font: textFont,
      color: rgb(0.1, 0.1, 0.5),
      maxWidth: boxWidth - 4,
    });

    page.drawLine({
      start: { x: boxLeft, y: boxBottom },
      end: { x: boxLeft + boxWidth, y: boxBottom },
      thickness: 0.75,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  return pdfDoc.save();
}
