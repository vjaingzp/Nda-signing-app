"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { finalizeSignaturesIfComplete } from "@/lib/nda/finalize-signatures";
import { hasSucceededPayment } from "@/lib/nda/payment";

export interface SignActionState {
  error?: string;
  success?: boolean;
}

function getRequestMeta(hdrs: Headers) {
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;
  const userAgent = hdrs.get("user-agent");
  return { ip, userAgent };
}

async function getOwnerParty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string
) {
  const { data } = await supabase
    .from("document_parties")
    .select("id, role, full_name")
    .eq("document_id", documentId)
    .eq("sort_order", 0)
    .single();
  return data;
}

export interface GenerateLinkActionState {
  error?: string;
}

// prevState/formData are unused but required to match the (state, payload)
// shape useActionState calls this with, once bound to documentId.
export async function generateSigningLink(
  documentId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: GenerateLinkActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData
): Promise<GenerateLinkActionState> {
  const supabase = await createClient();

  if (!(await hasSucceededPayment(supabase, documentId))) {
    return { error: "Payment is required before a signing link can be generated." };
  }

  const { data: counterparty } = await supabase
    .from("document_parties")
    .select("id, role")
    .eq("document_id", documentId)
    .eq("sort_order", 1)
    .single();

  if (!counterparty) return {};

  const { data: alreadySigned } = await supabase
    .from("signatures")
    .select("id")
    .eq("document_id", documentId)
    .eq("party_id", counterparty.id)
    .maybeSingle();

  if (alreadySigned) return {};

  const { data: existing } = await supabase
    .from("signing_links")
    .select("id")
    .eq("document_id", documentId)
    .eq("party_id", counterparty.id)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (!existing) {
    await supabase.from("signing_links").insert({
      document_id: documentId,
      party_id: counterparty.id,
      party_role: counterparty.role,
    });
  }

  const { data: document } = await supabase
    .from("documents")
    .select("status")
    .eq("id", documentId)
    .single();

  if (document?.status === "draft") {
    await supabase
      .from("documents")
      .update({ status: "awaiting_signatures" })
      .eq("id", documentId);
  }

  revalidatePath(`/documents/${documentId}/preview`);
  return {};
}

export async function signAsOwner(
  documentId: string,
  _prevState: SignActionState,
  formData: FormData
): Promise<SignActionState> {
  const signerName = formData.get("signerName");
  const consent = formData.get("consent");

  if (typeof signerName !== "string" || !signerName.trim()) {
    return { error: "Enter your name to sign." };
  }
  if (consent !== "on") {
    return { error: "You must confirm consent to sign." };
  }

  const supabase = await createClient();
  const party = await getOwnerParty(supabase, documentId);
  if (!party) {
    return { error: "Couldn't find your party details for this document." };
  }

  const { ip, userAgent } = getRequestMeta(await headers());

  const { error: insertError } = await supabase.from("signatures").insert({
    document_id: documentId,
    party_id: party.id,
    party_role: party.role,
    signer_name: signerName.trim(),
    typed_signature: signerName.trim(),
    consent_given: true,
    ip_address: ip,
    user_agent: userAgent,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "You've already signed this document." };
    }
    return { error: "Couldn't record your signature. Try again." };
  }

  const { data: document } = await supabase
    .from("documents")
    .select("status")
    .eq("id", documentId)
    .single();

  if (document?.status === "draft") {
    await supabase
      .from("documents")
      .update({ status: "awaiting_signatures" })
      .eq("id", documentId);
  }

  await finalizeSignaturesIfComplete(documentId);

  revalidatePath(`/documents/${documentId}/preview`);
  return { success: true };
}
