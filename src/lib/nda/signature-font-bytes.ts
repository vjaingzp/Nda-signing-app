import fontkit from "@pdf-lib/fontkit";
import { readFile } from "fs/promises";
import path from "path";
import type { PDFDocument, PDFFont } from "pdf-lib";
import { signatureStyleDef } from "./signature-styles";

// Server-only (uses fs/path) — never import this from a client component.
// Raw font bytes are cached at module scope since they're identical across
// every request; the embedded PDFFont objects returned by
// createSignatureFontEmbedder are cached per-PDFDocument instead, since a
// PDFFont is tied to the document it was embedded into.
const fontBytesCache = new Map<string, Promise<Buffer>>();

function loadFontBytes(fontFile: string): Promise<Buffer> {
  let cached = fontBytesCache.get(fontFile);
  if (!cached) {
    cached = readFile(path.join(process.cwd(), "public", "fonts", "signatures", fontFile));
    fontBytesCache.set(fontFile, cached);
  }
  return cached;
}

/**
 * Returns a function that embeds (and memoizes) the handwriting font for a
 * given signature style into `pdfDoc`, registering fontkit on it the first
 * time it's called. One embedder per PDFDocument.
 */
export function createSignatureFontEmbedder(pdfDoc: PDFDocument) {
  let fontkitRegistered = false;
  const embedded = new Map<string, PDFFont>();

  return async function embedSignatureFont(style: string | null | undefined): Promise<PDFFont> {
    const def = signatureStyleDef(style);
    const existing = embedded.get(def.id);
    if (existing) return existing;

    if (!fontkitRegistered) {
      pdfDoc.registerFontkit(fontkit);
      fontkitRegistered = true;
    }

    const bytes = await loadFontBytes(def.fontFile);
    const font = await pdfDoc.embedFont(bytes, { subset: true });
    embedded.set(def.id, font);
    return font;
  };
}
