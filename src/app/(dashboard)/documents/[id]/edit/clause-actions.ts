"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertDocumentEditable } from "@/lib/nda/assert-editable";
import type { GuidedField } from "@/types/database";

export interface ClauseActionState {
  error?: string;
  success?: boolean;
}

async function getGuidedFieldsForClause(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clauseKey: string,
  templateSlug: string | null
): Promise<GuidedField[]> {
  const { data: generic } = await supabase
    .from("clause_library")
    .select("guided_fields")
    .eq("clause_key", clauseKey)
    .is("template_slug", null)
    .maybeSingle();

  if (generic) return generic.guided_fields as GuidedField[];

  if (templateSlug) {
    const { data: specific } = await supabase
      .from("clause_library")
      .select("guided_fields")
      .eq("clause_key", clauseKey)
      .eq("template_slug", templateSlug)
      .maybeSingle();
    if (specific) return specific.guided_fields as GuidedField[];
  }

  return [];
}

export async function saveGuidedFields(
  documentId: string,
  clauseId: string,
  _prevState: ClauseActionState,
  formData: FormData
): Promise<ClauseActionState> {
  const supabase = await createClient();

  const editable = await assertDocumentEditable(supabase, documentId);
  if (editable.error) return editable;

  const { data: clause, error: clauseError } = await supabase
    .from("document_clauses")
    .select("id, clause_key, category")
    .eq("id", clauseId)
    .eq("document_id", documentId)
    .single();

  if (clauseError || !clause) {
    return { error: "Clause not found." };
  }
  if (clause.category !== "core") {
    return { error: "This clause doesn't use guided fields." };
  }

  const { data: document } = await supabase
    .from("documents")
    .select("template_slug")
    .eq("id", documentId)
    .single();

  const guidedFields = await getGuidedFieldsForClause(
    supabase,
    clause.clause_key,
    document?.template_slug ?? null
  );

  const values: Record<string, string> = {};
  for (const field of guidedFields) {
    const raw = formData.get(field.key);
    values[field.key] = typeof raw === "string" ? raw.trim() : "";
  }

  const { error: updateError } = await supabase
    .from("document_clauses")
    .update({ guided_field_values: values })
    .eq("id", clauseId)
    .eq("document_id", documentId);

  if (updateError) {
    return { error: "Couldn't save. Try again." };
  }

  revalidatePath(`/documents/${documentId}/edit`);
  return { success: true };
}

export async function saveOptionalClauseText(
  documentId: string,
  clauseId: string,
  _prevState: ClauseActionState,
  formData: FormData
): Promise<ClauseActionState> {
  const title = formData.get("title");
  const body = formData.get("body");

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof body !== "string" ||
    !body.trim()
  ) {
    return { error: "Title and text can't be empty." };
  }

  const supabase = await createClient();

  const editable = await assertDocumentEditable(supabase, documentId);
  if (editable.error) return editable;

  const { error } = await supabase
    .from("document_clauses")
    .update({ title: title.trim(), body: body.trim() })
    .eq("id", clauseId)
    .eq("document_id", documentId)
    .eq("category", "optional");

  if (error) {
    return { error: "Couldn't save. Try again." };
  }

  revalidatePath(`/documents/${documentId}/edit`);
  return { success: true };
}

export async function removeClause(documentId: string, clauseId: string) {
  const supabase = await createClient();

  const editable = await assertDocumentEditable(supabase, documentId);
  if (editable.error) return;

  await supabase
    .from("document_clauses")
    .update({ is_included: false })
    .eq("id", clauseId)
    .eq("document_id", documentId)
    .eq("is_removable", true);

  revalidatePath(`/documents/${documentId}/edit`);
}

export async function addCustomClause(
  documentId: string,
  _prevState: ClauseActionState,
  formData: FormData
): Promise<ClauseActionState> {
  const title = formData.get("title");
  const body = formData.get("body");

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof body !== "string" ||
    !body.trim()
  ) {
    return { error: "Title and text are required." };
  }

  const supabase = await createClient();

  const editable = await assertDocumentEditable(supabase, documentId);
  if (editable.error) return editable;

  const { data: last } = await supabase
    .from("document_clauses")
    .select("sort_order")
    .eq("document_id", documentId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("document_clauses").insert({
    document_id: documentId,
    clause_key: `custom_${crypto.randomUUID().slice(0, 8)}`,
    title: title.trim(),
    category: "optional",
    body: body.trim(),
    is_included: true,
    is_removable: true,
    sort_order: (last?.sort_order ?? 0) + 10,
  });

  if (error) {
    return { error: "Couldn't add clause. Try again." };
  }

  revalidatePath(`/documents/${documentId}/edit`);
  return { success: true };
}

export async function moveClause(
  documentId: string,
  clauseId: string,
  direction: "up" | "down"
) {
  const supabase = await createClient();

  const editable = await assertDocumentEditable(supabase, documentId);
  if (editable.error) return;

  const { data: clauses } = await supabase
    .from("document_clauses")
    .select("id, sort_order")
    .eq("document_id", documentId)
    .eq("category", "optional")
    .eq("is_included", true)
    .order("sort_order");

  if (!clauses) return;

  const index = clauses.findIndex((c) => c.id === clauseId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= clauses.length) return;

  const current = clauses[index];
  const swap = clauses[swapIndex];

  await supabase
    .from("document_clauses")
    .update({ sort_order: swap.sort_order })
    .eq("id", current.id);
  await supabase
    .from("document_clauses")
    .update({ sort_order: current.sort_order })
    .eq("id", swap.id);

  revalidatePath(`/documents/${documentId}/edit`);
}
