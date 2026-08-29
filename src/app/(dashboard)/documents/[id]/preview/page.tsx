import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDocumentClauses } from "@/lib/nda/get-document-clauses";
import { formatDate } from "@/lib/nda/render-clause";
import { partyDescription, partyLabel, partyRole } from "@/lib/nda/party-format";
import { DocumentCard, type DocumentCardParty } from "@/components/nda/DocumentCard";
import { SigningPanel } from "./SigningPanel";

export const metadata: Metadata = {
  title: "Preview | NDA Generator",
};

export default async function PreviewDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("documents")
    .select(
      "id, title, nda_type, template_slug, status, effective_date, term_months, governing_law"
    )
    .eq("id", id)
    .single();

  if (!document) {
    notFound();
  }

  const { data: partyRows } = await supabase
    .from("document_parties")
    .select("id, role, party_type, full_name, company_name, address, email, sort_order")
    .eq("document_id", id)
    .order("sort_order");
  const partyRecords = partyRows ?? [];

  const { data: signatureRows } = await supabase
    .from("signatures")
    .select("party_id, signer_name, signed_at")
    .eq("document_id", id);
  const signaturesByPartyId = new Map((signatureRows ?? []).map((s) => [s.party_id, s]));

  const { data: signingLinkRow } = await supabase
    .from("signing_links")
    .select("token")
    .eq("document_id", id)
    .eq("party_id", partyRecords[1]?.id ?? "")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const clauses = await getDocumentClauses(supabase, document);

  const isIncomplete =
    !document.effective_date || !document.term_months || partyRecords.length < 2;

  const cardParties: DocumentCardParty[] = [0, 1].map((index) => {
    const party = partyRecords[index];
    const signature = party ? signaturesByPartyId.get(party.id) : undefined;
    const role = partyRole(party, document.nda_type, index);
    return {
      label: partyLabel(role, index),
      description: partyDescription(party),
      signerName: signature?.signer_name ?? party?.full_name ?? null,
      signedAt: signature?.signed_at ?? null,
    };
  });

  const partyStatuses = [0, 1].map((index) => {
    const party = partyRecords[index];
    const signature = party ? signaturesByPartyId.get(party.id) : undefined;
    const role = partyRole(party, document.nda_type, index);
    return {
      label: partyLabel(role, index),
      fullName: party?.full_name ?? "",
      signerName: signature?.signer_name ?? null,
      signedAt: signature?.signed_at ?? null,
    };
  });

  const signingLinkUrl = signingLinkRow
    ? `${process.env.NEXT_PUBLIC_APP_URL}/sign/${signingLinkRow.token}`
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/documents/${document.id}/edit`}
            className="text-sm text-zinc-500 hover:underline"
          >
            ← Back to edit
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Preview</h1>
        </div>
        <a
          href={`/documents/${document.id}/pdf`}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Download PDF
        </a>
      </div>

      {document.status === "completed" && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          This document is fully signed and locked — no further edits are possible.
        </div>
      )}

      {isIncomplete && document.status !== "completed" && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This document isn&apos;t fully filled in yet, so some details below
          appear as placeholders.{" "}
          <Link href={`/documents/${document.id}/edit`} className="font-medium underline">
            Go back and finish the details
          </Link>
          .
        </div>
      )}

      <DocumentCard
        effectiveDateText={formatDate(document.effective_date)}
        parties={cardParties}
        clauses={clauses.map((c) => ({
          id: c.id,
          title: c.title,
          renderedBody: c.renderedBody,
        }))}
      />

      {!isIncomplete && (
        <SigningPanel
          documentId={document.id}
          status={document.status}
          ownerParty={partyStatuses[0]}
          counterpartyParty={partyStatuses[1]}
          signingLinkUrl={signingLinkUrl}
        />
      )}
    </div>
  );
}
