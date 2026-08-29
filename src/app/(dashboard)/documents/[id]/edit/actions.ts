"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { detailsFormSchema } from "@/lib/validation/details";
import { firstFieldErrors } from "@/lib/validation/form-errors";
import { assertDocumentEditable } from "@/lib/nda/assert-editable";
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

  const editable = await assertDocumentEditable(supabase, documentId);
  if (editable.error) return editable;

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

  // Updated in place (by sort_order) rather than deleted and recreated:
  // document_parties.id is now a foreign key target for signatures and
  // signing_links (on delete cascade), so re-creating the rows on every
  // save would silently wipe out an existing signature if details were
  // ever edited again mid-signing.
  const { data: existingParties } = await supabase
    .from("document_parties")
    .select("id, sort_order")
    .eq("document_id", documentId)
    .order("sort_order");

  const partyAData = {
    document_id: documentId,
    role: roleA,
    party_type: values.partyAType as PartyType,
    full_name: values.partyAFullName,
    company_name: values.partyAType === "business" ? values.partyACompanyName : null,
    address: values.partyAAddress,
    email: values.partyAEmail,
    sort_order: 0,
  };
  const partyBData = {
    document_id: documentId,
    role: roleB,
    party_type: values.partyBType as PartyType,
    full_name: values.partyBFullName,
    company_name: values.partyBType === "business" ? values.partyBCompanyName : null,
    address: values.partyBAddress,
    email: values.partyBEmail,
    sort_order: 1,
  };

  const existingA = existingParties?.[0];
  const { error: partyAError } = existingA
    ? await supabase.from("document_parties").update(partyAData).eq("id", existingA.id)
    : await supabase.from("document_parties").insert(partyAData);
  if (partyAError) {
    return { error: "Couldn't save party details. Try again." };
  }

  const existingB = existingParties?.[1];
  const { error: partyBError } = existingB
    ? await supabase.from("document_parties").update(partyBData).eq("id", existingB.id)
    : await supabase.from("document_parties").insert(partyBData);
  if (partyBError) {
    return { error: "Couldn't save party details. Try again." };
  }

  revalidatePath(`/documents/${documentId}/edit`);
  return { success: true };
}
