import type { SignatureStyle } from "@/types/database";

export type { SignatureStyle };

// Pure data only — no `fs`/`path` imports — so this can be imported from
// both client components (the style picker, DocumentCard) and server code
// (PDF generation). The actual font bytes for PDF embedding are loaded
// separately in signature-font-bytes.ts (server-only).
export interface SignatureStyleDef {
  id: SignatureStyle;
  label: string;
  /** CSS font-family value; matches the @font-face declarations in globals.css. */
  cssFontFamily: string;
  /** Filename under public/fonts/signatures/, used both as the @font-face src and, server-side, the file read for PDF embedding. */
  fontFile: string;
}

export const SIGNATURE_STYLES: SignatureStyleDef[] = [
  {
    id: "dancing_script",
    label: "Classic",
    cssFontFamily: "'Signature Dancing Script', cursive",
    fontFile: "DancingScript.ttf",
  },
  {
    id: "great_vibes",
    label: "Elegant",
    cssFontFamily: "'Signature Great Vibes', cursive",
    fontFile: "GreatVibes.ttf",
  },
  {
    id: "caveat",
    label: "Casual",
    cssFontFamily: "'Signature Caveat', cursive",
    fontFile: "Caveat.ttf",
  },
  {
    id: "pacifico",
    label: "Bold",
    cssFontFamily: "'Signature Pacifico', cursive",
    fontFile: "Pacifico.ttf",
  },
];

export const DEFAULT_SIGNATURE_STYLE: SignatureStyle = "dancing_script";

export function isSignatureStyle(value: unknown): value is SignatureStyle {
  return (
    typeof value === "string" &&
    SIGNATURE_STYLES.some((style) => style.id === value)
  );
}

export function signatureStyleDef(style: string | null | undefined): SignatureStyleDef {
  return (
    SIGNATURE_STYLES.find((s) => s.id === style) ??
    SIGNATURE_STYLES.find((s) => s.id === DEFAULT_SIGNATURE_STYLE)!
  );
}
