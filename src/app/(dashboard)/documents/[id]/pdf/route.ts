import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDocumentPdfBytes } from "@/lib/nda/serve-document-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Ownership check via the regular RLS-scoped client; the actual PDF
  // bytes (including, once complete, the frozen signed copy in private
  // Storage) are fetched with the admin client since there are no
  // client-facing storage policies on that bucket.
  const supabase = await createClient();
  const { data: document } = await supabase
    .from("documents")
    .select("id")
    .eq("id", id)
    .single();

  if (!document) {
    notFound();
  }

  const result = await getDocumentPdfBytes(createAdminClient(), id);
  if (!result) {
    notFound();
  }

  // Re-wrapped because TS's Response body type rejects Uint8Array<ArrayBufferLike>
  // as-is; a fresh Uint8Array satisfies it.
  return new Response(new Uint8Array(result.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  });
}
