import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDocumentClauses } from "@/lib/nda/get-document-clauses";
import { generateDocumentPdf, type PdfPartyInfo } from "@/lib/nda/generate-pdf";
import { formatDate } from "@/lib/nda/render-clause";
import { partyDescription, partyLabel, partyRole } from "@/lib/nda/party-format";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("documents")
    .select(
      "id, title, nda_type, template_slug, effective_date, term_months, governing_law"
    )
    .eq("id", id)
    .single();

  if (!document) {
    notFound();
  }

  const { data: partyRows } = await supabase
    .from("document_parties")
    .select("role, party_type, full_name, company_name, address, email, sort_order")
    .eq("document_id", id)
    .order("sort_order");

  const clauses = await getDocumentClauses(supabase, document);

  const parties: PdfPartyInfo[] = [0, 1].map((index) => {
    const party = partyRows?.[index];
    const role = partyRole(party, document.nda_type, index);
    return {
      label: partyLabel(role, index),
      description: partyDescription(party),
      signatureName: party?.full_name ?? null,
    };
  });

  const pdfBytes = await generateDocumentPdf({
    effectiveDateText: formatDate(document.effective_date),
    parties,
    clauses: clauses.map((clause) => ({
      title: clause.title,
      body: clause.renderedBody,
    })),
  });

  const filename = `${document.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;

  // Re-wrapped because TS's Response body type rejects pdf-lib's
  // Uint8Array<ArrayBufferLike> as-is; a fresh Uint8Array satisfies it.
  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
