"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSucceededPayment, PAYMENT_AMOUNT_CENTS } from "@/lib/nda/payment";

export interface PaymentActionState {
  error?: string;
  success?: boolean;
}

// Payment doesn't gate a completed (already sent for signature and done)
// or voided document — there's nothing left it would unlock.
const BLOCKED_STATUSES = ["completed", "voided"];

// prevState/formData are unused but required to match the (state, payload)
// shape useActionState calls this with, once bound to documentId.
export async function simulatePayment(
  documentId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: PaymentActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData
): Promise<PaymentActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: document } = await supabase
    .from("documents")
    .select("id, status")
    .eq("id", documentId)
    .single();

  if (!document) {
    return { error: "Document not found." };
  }

  if (BLOCKED_STATUSES.includes(document.status)) {
    return { error: "This document can no longer accept payment." };
  }

  if (await hasSucceededPayment(supabase, documentId)) {
    return { success: true };
  }

  const { error } = await supabase.from("payments").insert({
    document_id: documentId,
    user_id: user.id,
    status: "succeeded",
    amount_cents: PAYMENT_AMOUNT_CENTS,
    completed_at: new Date().toISOString(),
  });

  if (error) {
    return { error: "Couldn't process the test payment. Try again." };
  }

  revalidatePath(`/documents/${documentId}/payment`);
  revalidatePath(`/documents/${documentId}/preview`);
  return { success: true };
}
