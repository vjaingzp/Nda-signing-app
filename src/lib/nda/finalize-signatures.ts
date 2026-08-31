import { createAdminClient } from "@/lib/supabase/admin";
import { getDocumentClauses } from "@/lib/nda/get-document-clauses";
import { generateDocumentPdf, type PdfPartyInfo } from "@/lib/nda/generate-pdf";
import { stampUploadedPdf, type StampPlacement, type StampSignature } from "@/lib/nda/stamp-uploaded-pdf";
import { formatDate } from "@/lib/nda/render-clause";
import { partyDescription, partyLabel, partyRole } from "@/lib/nda/party-format";
import { addRetentionPeriod } from "@/lib/nda/retention";

const SIGNED_DOCUMENTS_BUCKET = "signed-documents";
const UPLOADED_AGREEMENTS_BUCKET = "uploaded-agreements";

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
      "id, title, source, nda_type, template_slug, status, effective_date, term_months, governing_law, upload_storage_path"
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
    .select("party_id, signer_name, signed_at, signature_style")
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

  let pdfBytes: Uint8Array;

  if (document.source === "upload") {
    if (!document.upload_storage_path) return;

    const { data: original, error: downloadError } = await admin.storage
      .from(UPLOADED_AGREEMENTS_BUCKET)
      .download(document.upload_storage_path);
    if (downloadError || !original) {
      throw new Error(`Couldn't load the uploaded PDF: ${downloadError?.message}`);
    }

    const { data: placementRows } = await admin
      .from("signature_placements")
      .select("party_role, field_type, page_number, x, y, width, height")
      .eq("document_id", documentId);

    const placements: StampPlacement[] = (placementRows ?? [])
      .filter((p) => p.party_role === "uploader" || p.party_role === "counterparty")
      .map((p) => ({
        role: p.party_role as "uploader" | "counterparty",
        fieldType: p.field_type === "date" ? "date" : "signature",
        pageNumber: p.page_number,
        x: Number(p.x),
        y: Number(p.y),
        width: Number(p.width),
        height: Number(p.height),
      }));

    const stampSignatures: StampSignature[] = parties
      .map((party) => {
        const signature = signaturesByPartyId.get(party.id);
        if (!signature || (party.role !== "uploader" && party.role !== "counterparty")) {
          return null;
        }
        return {
          role: party.role,
          signerName: signature.signer_name,
          signedAt: signature.signed_at,
          signatureStyle: signature.signature_style,
        };
      })
      .filter((s): s is StampSignature => s !== null);

    pdfBytes = await stampUploadedPdf(
      new Uint8Array(await original.arrayBuffer()),
      placements,
      stampSignatures
    );
  } else {
    const pdfParties: PdfPartyInfo[] = parties.map((party, index) => {
      const signature = signaturesByPartyId.get(party.id);
      const role = partyRole(party, document.nda_type, index);
      return {
        label: partyLabel(role, index),
        description: partyDescription(party),
        signatureName: signature?.signer_name ?? party.full_name,
        signedAt: signature?.signed_at ?? null,
        signatureStyle: signature?.signature_style ?? null,
      };
    });

    const clauses = await getDocumentClauses(admin, document);

    pdfBytes = await generateDocumentPdf({
      effectiveDateText: formatDate(document.effective_date),
      parties: pdfParties,
      clauses: clauses.map((c) => ({ title: c.title, body: c.renderedBody })),
    });
  }

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

  const finalizedAt = new Date();

  await admin
    .from("documents")
    .update({
      status: "completed",
      final_pdf_storage_path: storagePath,
      finalized_at: finalizedAt.toISOString(),
      // The 30-day storage retention clock starts now, not at document
      // creation — a draft that sat unfinished for weeks shouldn't eat
      // into the window a just-signed document gets.
      expires_at: addRetentionPeriod(finalizedAt),
    })
    .eq("id", documentId);
}
