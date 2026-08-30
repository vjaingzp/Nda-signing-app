import type { createClient } from "@/lib/supabase/server";
import type { Payment } from "@/types/database";

export async function hasSucceededPayment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("payments")
    .select("id")
    .eq("document_id", documentId)
    .eq("status", "succeeded")
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function getLatestPayment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string
): Promise<Payment | null> {
  const { data } = await supabase
    .from("payments")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
