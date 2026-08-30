"use server";

import { redirect } from "next/navigation";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UploadActionState {
  error?: string;
}

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB
const UPLOAD_BUCKET = "uploaded-agreements";

export async function uploadAgreement(
  _prevState: UploadActionState,
  formData: FormData
): Promise<UploadActionState> {
  const file = formData.get("file");
  const titleInput = formData.get("title");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PDF file to upload." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "That file is too large — the limit is 15MB." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdfMagicBytes =
    bytes.length > 5 &&
    String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  if (!isPdfMagicBytes) {
    return { error: "That doesn't look like a valid PDF file." };
  }

  let pageCount: number;
  try {
    const pdfDoc = await PDFDocument.load(bytes);
    pageCount = pdfDoc.getPageCount();
  } catch {
    return { error: "Couldn't read that PDF. It may be corrupted or password-protected." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const title =
    typeof titleInput === "string" && titleInput.trim()
      ? titleInput.trim()
      : file.name.replace(/\.pdf$/i, "");

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title,
      source: "upload",
      status: "draft",
      upload_filename: file.name,
      upload_page_count: pageCount,
    })
    .select("id")
    .single();

  if (insertError || !document) {
    return { error: "Couldn't create the document. Try again." };
  }

  // The bucket has no client-facing RLS policies (same as signed-documents
  // elsewhere in this app), so the write goes through the service-role
  // client — ownership was already established by the DB insert above,
  // which did respect RLS.
  const storagePath = `${document.id}.pdf`;
  const { error: uploadError } = await createAdminClient()
    .storage.from(UPLOAD_BUCKET)
    .upload(storagePath, bytes, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    // Best-effort cleanup so a failed upload doesn't leave a ghost document.
    await supabase.from("documents").delete().eq("id", document.id);
    return { error: "Couldn't store the file. Try again." };
  }

  await supabase
    .from("documents")
    .update({ upload_storage_path: storagePath })
    .eq("id", document.id);

  redirect(`/documents/${document.id}/placements`);
}
