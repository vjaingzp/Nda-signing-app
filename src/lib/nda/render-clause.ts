import type { Document, GuidedField } from "@/types/database";

function formatDate(value: string | null): string {
  if (!value) return "[effective date not yet set]";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Resolves {{key}} placeholders in a core clause's raw template.
 *
 * Two sources feed the substitution: a fixed set of document-level fields
 * (term length, governing law, effective date — already collected in the
 * Agreement Details step, so they're never asked for again here), and the
 * clause's own guided fields, each falling back to its schema-defined
 * `default` when the user hasn't customized it. That fallback is what lets
 * a document read as a complete, professional clause with zero edits.
 */
export function renderClauseBody(params: {
  body: string;
  guidedFields: GuidedField[];
  guidedFieldValues: Record<string, unknown>;
  document: Pick<Document, "term_months" | "governing_law" | "effective_date">;
}): string {
  const { body, guidedFields, guidedFieldValues, document } = params;

  const values: Record<string, string> = {
    term_months: document.term_months?.toString() ?? "[term not yet set]",
    governing_law: document.governing_law,
    effective_date: formatDate(document.effective_date),
  };

  for (const field of guidedFields) {
    const raw = guidedFieldValues[field.key];
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    values[field.key] = trimmed || field.default || "";
  }

  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in values ? values[key] : match
  );
}
