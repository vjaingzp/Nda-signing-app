import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getDocumentClauses } from "@/lib/nda/get-document-clauses";
import { generateDocumentPdf, type PdfPartyInfo } from "@/lib/nda/generate-pdf";
import { formatDate } from "@/lib/nda/render-clause";
import { partyDescription, partyLabel, partyRole } from "@/lib/nda/party-format";

const SIGNED_DOCUMENTS_BUCKET = "signed-documents";
const UPLOADED_AGREEMENTS_BUCKET = "uploaded-agreements";

/**
 * Returns the bytes to serve for a document's PDF. Once fully signed,
 * that's the frozen snapshot generated at completion time (from Storage) —
 * never regenerated, so it can't drift from what was actually signed even
 * if the underlying rows were somehow later touched. Before that: a
 * template document renders live from current data (showing whichever
 * signatures exist so far and blank lines for the rest); an uploaded
 * document just serves the original file as-is — placements aren't drawn
 * onto it until they're actually filled in at completion.
 */
export async function getDocumentPdfBytes(
  admin: SupabaseClient<Database>,
  documentId: string
): Promise<{ bytes: Uint8Array; filename: string } | null> {
  const { data: document } = await admin
    .from("documents")
    .select(
      "id, title, source, nda_type, template_slug, status, effective_date, term_months, governing_law, final_pdf_storage_path, upload_storage_path"
    )
    .eq("id", documentId)
    .single();

  if (!document) return null;

  const filename = `${document.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;

  if (document.status === "completed" && document.final_pdf_storage_path) {
    const { data, error } = await admin.storage
      .from(SIGNED_DOCUMENTS_BUCKET)
      .download(document.final_pdf_storage_path);
    if (error || !data) return null;
    return { bytes: new Uint8Array(await data.arrayBuffer()), filename };
  }

  if (document.source === "upload") {
    if (!document.upload_storage_path) return null;
    const { data, error } = await admin.storage
      .from(UPLOADED_AGREEMENTS_BUCKET)
      .download(document.upload_storage_path);
    if (error || !data) return null;
    return { bytes: new Uint8Array(await data.arrayBuffer()), filename };
  }

  const { data: partyRows } = await admin
    .from("document_parties")
    .select("id, role, party_type, full_name, company_name, address, email, sort_order")
    .eq("document_id", documentId)
    .order("sort_order");
  const parties = partyRows ?? [];

  const { data: signatureRows } = await admin
    .from("signatures")
    .select("party_id, signer_name, signed_at, signature_style")
    .eq("document_id", documentId);
  const signaturesByPartyId = new Map((signatureRows ?? []).map((s) => [s.party_id, s]));

  const clauses = await getDocumentClauses(admin, document);

  const pdfParties: PdfPartyInfo[] = [0, 1].map((index) => {
    const party = parties[index];
    const signature = party ? signaturesByPartyId.get(party.id) : undefined;
    const role = partyRole(party, document.nda_type, index);
    return {
      label: partyLabel(role, index),
      description: partyDescription(party),
      signatureName: signature?.signer_name ?? party?.full_name ?? null,
      signedAt: signature?.signed_at ?? null,
      signatureStyle: signature?.signature_style ?? null,
    };
  });

  const pdfBytes = await generateDocumentPdf({
    effectiveDateText: formatDate(document.effective_date),
    parties: pdfParties,
    clauses: clauses.map((c) => ({ title: c.title, body: c.renderedBody })),
  });

  return { bytes: new Uint8Array(pdfBytes), filename };
}
