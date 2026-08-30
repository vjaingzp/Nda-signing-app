import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UPLOAD_BUCKET = "uploaded-agreements";

/**
 * Serves the raw, as-uploaded PDF bytes to the owner (used by the
 * placement editor to render pages for click-to-place, and available as
 * a general "view the original" link). Never the stamped/signed copy —
 * that's served from /documents/[id]/pdf once the document is complete.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: document } = await supabase
    .from("documents")
    .select("upload_storage_path, upload_filename")
    .eq("id", id)
    .single();

  if (!document?.upload_storage_path) {
    notFound();
  }

  const { data, error } = await createAdminClient()
    .storage.from(UPLOAD_BUCKET)
    .download(document.upload_storage_path);

  if (error || !data) {
    notFound();
  }

  return new Response(data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${document.upload_filename ?? "document.pdf"}"`,
    },
  });
}
