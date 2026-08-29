import { createAdminClient } from "@/lib/supabase/admin";
import { getDocumentClauses } from "@/lib/nda/get-document-clauses";
import { generateDocumentPdf, type PdfPartyInfo } from "@/lib/nda/generate-pdf";
import { formatDate } from "@/lib/nda/render-clause";
import { partyDescription, partyLabel, partyRole } from "@/lib/nda/party-format";

const SIGNED_DOCUMENTS_BUCKET = "signed-documents";

/**
 * Runs after any signature is recorded (by either the owner or the
 * counterparty). Re-derives the document's status from how many of its
 * two parties have signed, and — once both have — renders and stores the
 * final signed PDF so /documents/[id]/pdf can serve that exact frozen
 * snapshot instead of regenerating from (potentially later-edited) live
 * data. Uses the service-role client throughout: this runs from both the
 * authenticated owner path and the token-based counterparty path, and
 * the storage bucket has no client-facing RLS policies of its own.
 */
export async function finalizeSignaturesIfComplete(documentId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: document } = await admin
    .from("documents")
    .select(
      "id, title, nda_type, template_slug, status, effective_date, term_months, governing_law"
    )
    .eq("id", documentId)
    .single();

  if (!document || document.status === "completed") return;

  const { data: partyRows } = await admin
    .from("document_parties")
    .select("id, role, party_type, full_name, company_name, address, email, sort_order")
    .eq("document_id", documentId)
    .order("sort_order");

  const parties = partyRows ?? [];
  if (parties.length < 2) return;

  const { data: signatureRows } = await admin
    .from("signatures")
    .select("party_id, signer_name, signed_at")
    .eq("document_id", documentId);

  const signaturesByPartyId = new Map(
    (signatureRows ?? []).map((s) => [s.party_id, s])
  );

  const allSigned = parties.every((p) => signaturesByPartyId.has(p.id));

  if (!allSigned) {
    if (signatureRows && signatureRows.length > 0 && document.status !== "partially_signed") {
      await admin
        .from("documents")
        .update({ status: "partially_signed" })
        .eq("id", documentId);
    }
    return;
  }

  const pdfParties: PdfPartyInfo[] = parties.map((party, index) => {
    const signature = signaturesByPartyId.get(party.id);
    const role = partyRole(party, document.nda_type, index);
    return {
      label: partyLabel(role, index),
      description: partyDescription(party),
      signatureName: signature?.signer_name ?? party.full_name,
      signedAt: signature?.signed_at ?? null,
    };
  });

  const clauses = await getDocumentClauses(admin, document);

  const pdfBytes = await generateDocumentPdf({
    effectiveDateText: formatDate(document.effective_date),
    parties: pdfParties,
    clauses: clauses.map((c) => ({ title: c.title, body: c.renderedBody })),
  });

  const storagePath = `${documentId}.pdf`;
  const { error: uploadError } = await admin.storage
    .from(SIGNED_DOCUMENTS_BUCKET)
    .upload(storagePath, new Uint8Array(pdfBytes), {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Couldn't store the signed PDF: ${uploadError.message}`);
  }

  await admin
    .from("documents")
    .update({
      status: "completed",
      final_pdf_storage_path: storagePath,
      finalized_at: new Date().toISOString(),
    })
    .eq("id", documentId);
}
