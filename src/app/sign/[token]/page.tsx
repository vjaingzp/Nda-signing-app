import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDocumentClauses } from "@/lib/nda/get-document-clauses";
import { formatDate } from "@/lib/nda/render-clause";
import { partyDescription, partyLabel, partyRole } from "@/lib/nda/party-format";
import { DocumentCard, type DocumentCardParty } from "@/components/nda/DocumentCard";
import { DemoSignatureNotice } from "@/components/ui/demo-signature-notice";
import { SignForm } from "./SignForm";

export const metadata: Metadata = {
  title: "Sign NDA | NDA Generator",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-3xl">
        <p className="mb-6 text-center text-sm font-semibold text-zinc-900">
          NDA Generator
        </p>
        {children}
      </div>
    </div>
  );
}

export default async function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: link } = await admin
    .from("signing_links")
    .select("id, document_id, party_id, party_role, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!link) {
    return (
      <Shell>
        <p className="text-center text-sm text-zinc-600">
          This signing link is invalid. Ask the sender for a new one.
        </p>
      </Shell>
    );
  }

  if (new Date(link.expires_at) < new Date()) {
    return (
      <Shell>
        <p className="text-center text-sm text-zinc-600">
          This signing link has expired. Ask the sender for a new one.
        </p>
      </Shell>
    );
  }

  const { data: document } = await admin
    .from("documents")
    .select(
      "id, title, source, nda_type, template_slug, status, effective_date, term_months, governing_law"
    )
    .eq("id", link.document_id)
    .single();

  if (!document) {
    return (
      <Shell>
        <p className="text-center text-sm text-zinc-600">
          This document is no longer available.
        </p>
      </Shell>
    );
  }

  if (document.status === "voided") {
    return (
      <Shell>
        <p className="text-center text-sm text-zinc-600">
          This document was voided by the sender and can no longer be signed.
        </p>
      </Shell>
    );
  }

  const { data: partyRows } = await admin
    .from("document_parties")
    .select("id, role, party_type, full_name, company_name, address, email, sort_order")
    .eq("document_id", link.document_id)
    .order("sort_order");
  const partyRecords = partyRows ?? [];

  const { data: signatureRows } = await admin
    .from("signatures")
    .select("party_id, signer_name, signed_at")
    .eq("document_id", link.document_id);
  const signaturesByPartyId = new Map((signatureRows ?? []).map((s) => [s.party_id, s]));

  const isUpload = document.source === "upload";
  const clauses = isUpload ? [] : await getDocumentClauses(admin, document);

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

  const myParty = partyRecords.find((p) => p.id === link.party_id);
  const mySignature = signaturesByPartyId.get(link.party_id);
  const myIndex = partyRecords.findIndex((p) => p.id === link.party_id);
  const myLabel = partyLabel(
    partyRole(myParty, document.nda_type, myIndex),
    myIndex
  );

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">{document.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            You&apos;ve been asked to review and sign this document.
          </p>
        </div>

        <DemoSignatureNotice />

        <div className="flex justify-end">
          <a
            href={`/sign/${token}/pdf`}
            download
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:underline"
          >
            Download PDF
          </a>
        </div>

        {isUpload ? (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <iframe
              src={`/sign/${token}/pdf`}
              title={document.title}
              className="h-[800px] w-full"
            />
          </div>
        ) : (
          <DocumentCard
            effectiveDateText={formatDate(document.effective_date)}
            parties={cardParties}
            clauses={clauses.map((c) => ({
              id: c.id,
              title: c.title,
              renderedBody: c.renderedBody,
            }))}
          />
        )}

        {mySignature ? (
          <div className="flex flex-col gap-3 rounded-xl border border-green-300 bg-green-50 p-6 text-center">
            <p className="font-medium text-green-900">You&apos;ve signed as {myLabel}.</p>
            <p className="text-sm text-green-800">Thank you — no further action is needed.</p>
          </div>
        ) : (
          <SignForm
            token={token}
            partyLabel={myLabel}
            defaultName={myParty?.full_name ?? ""}
          />
        )}

        {document.status === "completed" && (
          <p className="text-center text-sm text-zinc-500">
            Both parties have signed this agreement.
          </p>
        )}
      </div>
    </Shell>
  );
}
