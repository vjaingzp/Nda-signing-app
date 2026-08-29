import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDocumentPdfBytes } from "@/lib/nda/serve-document-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: link } = await admin
    .from("signing_links")
    .select("document_id")
    .eq("token", token)
    .maybeSingle();

  if (!link) {
    notFound();
  }

  const result = await getDocumentPdfBytes(admin, link.document_id);
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
