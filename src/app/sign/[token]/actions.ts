"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeSignaturesIfComplete } from "@/lib/nda/finalize-signatures";

export interface SignActionState {
  error?: string;
  success?: boolean;
}

export async function submitSignature(
  token: string,
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

  const admin = createAdminClient();

  const { data: link } = await admin
    .from("signing_links")
    .select("id, document_id, party_id, party_role, used_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!link) {
    return { error: "This signing link is invalid." };
  }
  if (new Date(link.expires_at) < new Date()) {
    return { error: "This signing link has expired." };
  }

  const { data: existingDocument } = await admin
    .from("documents")
    .select("status")
    .eq("id", link.document_id)
    .single();

  if (existingDocument?.status === "voided") {
    return { error: "This document was voided by the sender and can no longer be signed." };
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? null;
  const userAgent = hdrs.get("user-agent");

  const { error: insertError } = await admin.from("signatures").insert({
    document_id: link.document_id,
    party_id: link.party_id,
    party_role: link.party_role,
    signing_link_id: link.id,
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

  if (!link.used_at) {
    await admin
      .from("signing_links")
      .update({ used_at: new Date().toISOString() })
      .eq("id", link.id);
  }

  if (existingDocument?.status === "draft") {
    await admin
      .from("documents")
      .update({ status: "awaiting_signatures" })
      .eq("id", link.document_id);
  }

  await finalizeSignaturesIfComplete(link.document_id);

  revalidatePath(`/sign/${token}`);
  return { success: true };
}
