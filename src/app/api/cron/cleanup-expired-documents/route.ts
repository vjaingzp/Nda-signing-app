import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SIGNED_DOCUMENTS_BUCKET = "signed-documents";
const UPLOADED_AGREEMENTS_BUCKET = "uploaded-agreements";

/**
 * Daily sweep (see vercel.json) that enforces the 30-day storage retention
 * policy: once a signed document's expires_at has passed, its stored
 * PDF(s) are deleted from Storage. The documents row itself, its parties,
 * signatures, and payment history are kept — only the file bytes go, so
 * the audit trail survives even though the file doesn't. For an uploaded
 * document this is genuinely destructive (no clause data to regenerate
 * from), which is exactly why the preview/dashboard show a reminder in
 * the days before this runs.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: expired, error } = await admin
    .from("documents")
    .select("id, source, final_pdf_storage_path, upload_storage_path")
    .eq("status", "completed")
    .is("deleted_at", null)
    .lte("expires_at", new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const deleted: string[] = [];
  const failed: string[] = [];

  for (const doc of expired ?? []) {
    const targets: { bucket: string; path: string }[] = [];
    if (doc.final_pdf_storage_path) {
      targets.push({ bucket: SIGNED_DOCUMENTS_BUCKET, path: doc.final_pdf_storage_path });
    }
    if (doc.source === "upload" && doc.upload_storage_path) {
      targets.push({ bucket: UPLOADED_AGREEMENTS_BUCKET, path: doc.upload_storage_path });
    }

    let ok = true;
    for (const { bucket, path } of targets) {
      const { error: removeError } = await admin.storage.from(bucket).remove([path]);
      if (removeError) ok = false;
    }

    if (!ok) {
      failed.push(doc.id);
      continue;
    }

    await admin
      .from("documents")
      .update({
        deleted_at: new Date().toISOString(),
        final_pdf_storage_path: null,
        upload_storage_path: null,
      })
      .eq("id", doc.id);

    deleted.push(doc.id);
  }

  return NextResponse.json({ deleted, failed });
}
