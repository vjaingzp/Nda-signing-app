"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { detailsFormSchema } from "@/lib/validation/details";
import { firstFieldErrors } from "@/lib/validation/form-errors";
import type { NdaType, PartyRole, PartyType } from "@/types/database";

export interface DetailsActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

export async function saveDocumentDetails(
  documentId: string,
  _prevState: DetailsActionState,
  formData: FormData
): Promise<DetailsActionState> {
  const parsed = detailsFormSchema.safeParse({
    effectiveDate: formData.get("effectiveDate"),
    termMonths: formData.get("termMonths"),
    partyAType: formData.get("partyAType"),
    partyAFullName: formData.get("partyAFullName"),
    partyACompanyName: formData.get("partyACompanyName"),
    partyAAddress: formData.get("partyAAddress"),
    partyAEmail: formData.get("partyAEmail"),
    partyBType: formData.get("partyBType"),
    partyBFullName: formData.get("partyBFullName"),
    partyBCompanyName: formData.get("partyBCompanyName"),
    partyBAddress: formData.get("partyBAddress"),
    partyBEmail: formData.get("partyBEmail"),
  });

  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.issues) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: document, error: documentFetchError } = await supabase
    .from("documents")
    .select("id, nda_type")
    .eq("id", documentId)
    .single();

  if (documentFetchError || !document) {
    return { error: "Document not found." };
  }

  const ndaType = document.nda_type as NdaType;
  const [roleA, roleB]: [PartyRole, PartyRole] =
    ndaType === "mutual" ? ["mutual", "mutual"] : ["disclosing", "receiving"];

  const values = parsed.data;

  const { error: updateError } = await supabase
    .from("documents")
    .update({
      effective_date: values.effectiveDate,
      term_months: values.termMonths,
    })
    .eq("id", documentId);

  if (updateError) {
    return { error: "Couldn't save details. Try again." };
  }

  const { error: deleteError } = await supabase
    .from("document_parties")
    .delete()
    .eq("document_id", documentId);

  if (deleteError) {
    return { error: "Couldn't save party details. Try again." };
  }

  const { error: insertError } = await supabase.from("document_parties").insert([
    {
      document_id: documentId,
      role: roleA,
      party_type: values.partyAType as PartyType,
      full_name: values.partyAFullName,
      company_name: values.partyAType === "business" ? values.partyACompanyName : null,
      address: values.partyAAddress,
      email: values.partyAEmail,
      sort_order: 0,
    },
    {
      document_id: documentId,
      role: roleB,
      party_type: values.partyBType as PartyType,
      full_name: values.partyBFullName,
      company_name: values.partyBType === "business" ? values.partyBCompanyName : null,
      address: values.partyBAddress,
      email: values.partyBEmail,
      sort_order: 1,
    },
  ]);

  if (insertError) {
    return { error: "Couldn't save party details. Try again." };
  }

  revalidatePath(`/documents/${documentId}/edit`);
  return { success: true };
}
