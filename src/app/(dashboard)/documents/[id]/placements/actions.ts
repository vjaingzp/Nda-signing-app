"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertDocumentEditable } from "@/lib/nda/assert-editable";
import type { PartyRole } from "@/types/database";

export interface PlacementInput {
  role: Extract<PartyRole, "uploader" | "counterparty">;
  fieldType: "signature" | "date";
  pageNumber: number;
  /** Normalized 0..1, relative to page width, measured from the left. */
  x: number;
  /** Normalized 0..1, relative to page height, measured from the top. */
  y: number;
  width: number;
  height: number;
}

export interface SavePlacementSetupResult {
  error?: string;
  success?: boolean;
}

export async function savePlacementSetup(
  documentId: string,
  payload: {
    counterpartyName: string;
    counterpartyEmail: string;
    placements: PlacementInput[];
  }
): Promise<SavePlacementSetupResult> {
  const counterpartyName = payload.counterpartyName.trim();
  if (!counterpartyName) {
    return { error: "Enter the counterparty's name." };
  }

  const supabase = await createClient();

  const editable = await assertDocumentEditable(supabase, documentId);
  if (editable.error) {
    return { error: editable.error };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: document } = await supabase
    .from("documents")
    .select("id, source")
    .eq("id", documentId)
    .single();

  if (!document || document.source !== "upload") {
    return { error: "This isn't an uploaded document." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const uploaderName = profile?.full_name?.trim() || profile?.email || "Uploader";

  const { error: deletePartiesError } = await supabase
    .from("document_parties")
    .delete()
    .eq("document_id", documentId);
  if (deletePartiesError) {
    return { error: "Couldn't save the recipients. Try again." };
  }

  const { error: insertPartiesError } = await supabase.from("document_parties").insert([
    {
      document_id: documentId,
      role: "uploader" as PartyRole,
      party_type: "individual",
      full_name: uploaderName,
      email: profile?.email ?? null,
      sort_order: 0,
    },
    {
      document_id: documentId,
      role: "counterparty" as PartyRole,
      party_type: "individual",
      full_name: counterpartyName,
      email: payload.counterpartyEmail.trim() || null,
      sort_order: 1,
    },
  ]);
  if (insertPartiesError) {
    return { error: "Couldn't save the recipients. Try again." };
  }

  const { error: deletePlacementsError } = await supabase
    .from("signature_placements")
    .delete()
    .eq("document_id", documentId);
  if (deletePlacementsError) {
    return { error: "Couldn't save the placements. Try again." };
  }

  if (payload.placements.length > 0) {
    const { error: insertPlacementsError } = await supabase
      .from("signature_placements")
      .insert(
        payload.placements.map((p) => ({
          document_id: documentId,
          party_role: p.role as PartyRole,
          page_number: p.pageNumber,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          field_type: p.fieldType,
        }))
      );
    if (insertPlacementsError) {
      return { error: "Couldn't save the placements. Try again." };
    }
  }

  revalidatePath(`/documents/${documentId}/placements`);
  revalidatePath(`/documents/${documentId}/preview`);
  return { success: true };
}
