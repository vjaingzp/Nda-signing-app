import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDocumentClauses } from "@/lib/nda/get-document-clauses";
import { formatDate } from "@/lib/nda/render-clause";
import { partyDescription, partyLabel, partyRole } from "@/lib/nda/party-format";

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

  const { data: parties } = await supabase
    .from("document_parties")
    .select("role, party_type, full_name, company_name, address, email, sort_order")
    .eq("document_id", id)
    .order("sort_order");

  const clauses = await getDocumentClauses(supabase, document);

  const isIncomplete =
    !document.effective_date || !document.term_months || (parties?.length ?? 0) < 2;

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

      {isIncomplete && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This document isn&apos;t fully filled in yet, so some details below
          appear as placeholders.{" "}
          <Link href={`/documents/${document.id}/edit`} className="font-medium underline">
            Go back and finish the details
          </Link>
          .
        </div>
      )}

      <div className="mx-auto w-full max-w-3xl rounded-xl border border-zinc-200 bg-white p-10 shadow-sm sm:p-14">
        <div className="font-serif text-zinc-900">
          <h2 className="text-center text-xl font-bold tracking-wide">
            NON-DISCLOSURE AGREEMENT
          </h2>

          <p className="mt-8 leading-relaxed">
            This Non-Disclosure Agreement (the &quot;Agreement&quot;) is made and
            entered into on {formatDate(document.effective_date)}, by and between:
          </p>

          <ul className="mt-4 flex flex-col gap-2 leading-relaxed">
            {[0, 1].map((index) => {
              const party = parties?.[index];
              const role = partyRole(party, document.nda_type, index);
              return (
                <li key={index}>
                  <span className="font-semibold">{partyLabel(role, index)}:</span>{" "}
                  {partyDescription(party)}.
                </li>
              );
            })}
          </ul>

          <p className="mt-4 leading-relaxed">
            (each a &quot;Party&quot; and, collectively, the &quot;Parties&quot;).
          </p>

          <div className="mt-10 flex flex-col gap-6">
            {clauses.map((clause, index) => (
              <div key={clause.id}>
                <h3 className="font-semibold">
                  {index + 1}. {clause.title}
                </h3>
                <p className="mt-1 whitespace-pre-line leading-relaxed">
                  {clause.renderedBody}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-10 leading-relaxed">
            IN WITNESS WHEREOF, the Parties have executed this Agreement as of
            the date first written above.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-2">
            {[0, 1].map((index) => {
              const party = parties?.[index];
              const role = partyRole(party, document.nda_type, index);
              return (
                <div key={index} className="flex flex-col gap-4">
                  <p className="text-sm font-semibold">{partyLabel(role, index)}</p>
                  <div className="border-b border-zinc-400 pb-1 text-sm text-zinc-400">
                    Signature
                  </div>
                  <div className="border-b border-zinc-400 pb-1 text-sm">
                    {party?.full_name ?? (
                      <span className="text-zinc-400">Name not yet provided</span>
                    )}
                  </div>
                  <div className="border-b border-zinc-400 pb-1 text-sm text-zinc-400">
                    Date
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
