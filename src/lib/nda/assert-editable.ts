import type { createClient } from "@/lib/supabase/server";
import type { DocumentStatus } from "@/types/database";

// Locked from the moment any party has signed — not just once everyone
// has. A signature attaches to specific terms; letting the document keep
// changing after one party signs but before the other does would leave
// the first signer's consent attached to text they never actually agreed
// to. 'voided' is also locked: it's a terminal status (see void-actions.ts).
const LOCKED_STATUSES: DocumentStatus[] = ["partially_signed", "completed", "voided"];

/**
 * Refused at the server-action layer, not just hidden in the UI — a
 * direct POST could otherwise still mutate a signed (or voided) document.
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

  if (document && LOCKED_STATUSES.includes(document.status)) {
    if (document.status === "voided") {
      return { error: "This document has been voided and can no longer be edited." };
    }
    return {
      error:
        "This document already has a signature on it and can no longer be edited. Void it and start a new document if changes are needed.",
    };
  }

  return {};
}
