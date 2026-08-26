"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { NdaType } from "@/types/database";

export interface NewDocumentActionState {
  error?: string;
}

const NDA_TYPES: NdaType[] = ["one_way", "mutual"];

export async function createDraftDocument(
  _prevState: NewDocumentActionState,
  formData: FormData
): Promise<NewDocumentActionState> {
  const ndaType = formData.get("ndaType");
  const templateSlug = formData.get("templateSlug");

  if (
    typeof ndaType !== "string" ||
    !NDA_TYPES.includes(ndaType as NdaType) ||
    typeof templateSlug !== "string" ||
    !templateSlug
  ) {
    return { error: "Choose an NDA type and a template to continue." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("slug, name, supports_type")
    .eq("slug", templateSlug)
    .eq("is_active", true)
    .single();

  if (templateError || !template) {
    return { error: "That template is not available." };
  }

  if (!(template.supports_type as NdaType[]).includes(ndaType as NdaType)) {
    return { error: "That template doesn't support the selected NDA type." };
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title: `${template.name} NDA`,
      source: "template",
      template_slug: template.slug,
      nda_type: ndaType as NdaType,
      status: "draft",
    })
    .select("id")
    .single();

  if (documentError || !document) {
    return { error: "Couldn't create the document. Try again." };
  }

  const { data: clauses, error: clauseError } = await supabase
    .from("clause_library")
    .select(
      "clause_key, title, category, default_body, guided_fields, is_removable, sort_order"
    )
    .or(`template_slug.is.null,template_slug.eq.${template.slug}`)
    .order("sort_order");

  if (clauseError) {
    return { error: "Couldn't set up the document's clauses. Try again." };
  }

  if (clauses && clauses.length > 0) {
    const { error: insertClausesError } = await supabase
      .from("document_clauses")
      .insert(
        clauses.map((clause) => ({
          document_id: document.id,
          clause_key: clause.clause_key,
          title: clause.title,
          category: clause.category,
          body: clause.default_body,
          is_included: true,
          is_removable: clause.is_removable,
          sort_order: clause.sort_order,
        }))
      );

    if (insertClausesError) {
      return { error: "Couldn't set up the document's clauses. Try again." };
    }
  }

  redirect(`/documents/${document.id}/edit`);
}
