import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { renderClauseBody } from "@/lib/nda/render-clause";
import type { GuidedField, NdaType } from "@/types/database";
import { DetailsForm } from "./DetailsForm";
import { ClausesEditor, type ClauseItem } from "./ClausesEditor";

export const metadata: Metadata = {
  title: "Edit NDA | NDA Generator",
};

export default async function EditDocumentPage({
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
    .select("party_type, full_name, company_name, address, email, sort_order")
    .eq("document_id", id)
    .order("sort_order");

  const partyA = parties?.[0]
    ? {
        partyType: parties[0].party_type,
        fullName: parties[0].full_name,
        companyName: parties[0].company_name ?? "",
        address: parties[0].address ?? "",
        email: parties[0].email ?? "",
      }
    : undefined;
  const partyB = parties?.[1]
    ? {
        partyType: parties[1].party_type,
        fullName: parties[1].full_name,
        companyName: parties[1].company_name ?? "",
        address: parties[1].address ?? "",
        email: parties[1].email ?? "",
      }
    : undefined;

  const today = new Date().toISOString().slice(0, 10);

  const { data: documentClauses } = await supabase
    .from("document_clauses")
    .select(
      "id, clause_key, title, category, body, guided_field_values, is_removable, sort_order"
    )
    .eq("document_id", id)
    .eq("is_included", true)
    .order("sort_order");

  const { data: libraryEntries } = await supabase
    .from("clause_library")
    .select("clause_key, template_slug, guided_fields")
    .or(
      document.template_slug
        ? `template_slug.is.null,template_slug.eq.${document.template_slug}`
        : "template_slug.is.null"
    );

  const guidedFieldsByKey = new Map<string, GuidedField[]>();
  for (const entry of libraryEntries ?? []) {
    // A template-specific override (if one exists) wins over the generic
    // (template_slug = null) definition for the same clause_key.
    if (!guidedFieldsByKey.has(entry.clause_key) || entry.template_slug !== null) {
      guidedFieldsByKey.set(entry.clause_key, entry.guided_fields as GuidedField[]);
    }
  }

  const clauseItems: ClauseItem[] = (documentClauses ?? []).map((clause) => {
    const guidedFields = guidedFieldsByKey.get(clause.clause_key) ?? [];
    const guidedFieldValues = clause.guided_field_values as Record<string, unknown>;
    return {
      id: clause.id,
      clauseKey: clause.clause_key,
      title: clause.title,
      category: clause.category,
      body: clause.body,
      renderedBody:
        clause.category === "core"
          ? renderClauseBody({
              body: clause.body,
              guidedFields,
              guidedFieldValues,
              document,
            })
          : clause.body,
      guidedFieldValues,
      guidedFields,
      isRemovable: clause.is_removable,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{document.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {document.nda_type === "mutual" ? "Mutual" : "One-way"} NDA · template:{" "}
          {document.template_slug} · status: {document.status}
        </p>
      </div>

      <DetailsForm
        documentId={document.id}
        ndaType={document.nda_type as NdaType}
        effectiveDate={document.effective_date ?? today}
        termMonths={document.term_months?.toString() ?? ""}
        partyA={partyA}
        partyB={partyB}
      />

      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Clauses</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Read through below. Core clauses can be adjusted through guided
          fields; optional clauses can be edited freely, reordered, or
          removed.
        </p>
        <div className="mt-4">
          <ClausesEditor documentId={document.id} clauses={clauseItems} />
        </div>
      </div>
    </div>
  );
}
