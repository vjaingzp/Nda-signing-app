import type { createClient } from "@/lib/supabase/server";

/**
 * Once every party has signed, the document locks: clause and detail
 * edits are refused at the server-action layer, not just hidden in the
 * UI (a direct POST could otherwise still mutate a signed document).
 */
export async function assertDocumentEditable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string
): Promise<{ error?: string }> {
  const { data: document } = await supabase
    .from("documents")
    .select("status")
    .eq("id", documentId)
    .single();

  if (document?.status === "completed") {
    return { error: "This document is fully signed and can no longer be edited." };
  }

  return {};
}
