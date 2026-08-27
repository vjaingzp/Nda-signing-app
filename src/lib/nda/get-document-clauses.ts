import type { createClient } from "@/lib/supabase/server";
import { renderClauseBody } from "./render-clause";
import type { ClauseCategory, Document, GuidedField } from "@/types/database";

export interface ClauseItem {
  id: string;
  clauseKey: string;
  title: string;
  category: ClauseCategory;
  body: string;
  renderedBody: string;
  guidedFieldValues: Record<string, unknown>;
  guidedFields: GuidedField[];
  isRemovable: boolean;
}

/**
 * Fetches this document's included clauses (its own snapshot in
 * document_clauses) and resolves each core clause's guided-field
 * placeholders into clean, readable text. Used by both the clause editor
 * and the full document preview so they never disagree on what a clause
 * actually says.
 */
export async function getDocumentClauses(
  supabase: Awaited<ReturnType<typeof createClient>>,
  document: Pick<
    Document,
    "id" | "template_slug" | "term_months" | "governing_law" | "effective_date"
  >
): Promise<ClauseItem[]> {
  const { data: documentClauses } = await supabase
    .from("document_clauses")
    .select(
      "id, clause_key, title, category, body, guided_field_values, is_removable, sort_order"
    )
    .eq("document_id", document.id)
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

  return (documentClauses ?? []).map((clause) => {
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
}
