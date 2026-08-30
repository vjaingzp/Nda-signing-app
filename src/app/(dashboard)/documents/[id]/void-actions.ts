"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DocumentStatus } from "@/types/database";

// Voidable any time before the document is fully executed or already
// voided. Once 'completed', both parties have already fully signed — that
// isn't a mistake to void away, it's a finished agreement.
const VOIDABLE_STATUSES: DocumentStatus[] = [
  "draft",
  "pending_payment",
  "awaiting_signatures",
  "partially_signed",
];

export interface VoidActionState {
  error?: string;
}

// prevState/formData are unused but required to match the (state, payload)
// shape useActionState calls this with, once bound to documentId.
export async function voidDocument(
  documentId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: VoidActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData
): Promise<VoidActionState> {
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("documents")
    .select("status")
    .eq("id", documentId)
    .single();

  if (!document || !VOIDABLE_STATUSES.includes(document.status)) {
    return { error: "This document can no longer be voided." };
  }

  const { error } = await supabase
    .from("documents")
    .update({ status: "voided" })
    .eq("id", documentId);

  if (error) {
    return { error: "Couldn't void the document. Try again." };
  }

  revalidatePath(`/documents/${documentId}/edit`);
  revalidatePath(`/documents/${documentId}/preview`);
  revalidatePath("/dashboard");
  return {};
}
