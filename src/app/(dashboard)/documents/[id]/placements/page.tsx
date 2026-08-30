import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlacementEditor } from "./PlacementEditor";
import type { PlacementInput } from "./actions";

export const metadata: Metadata = {
  title: "Place fields | NDA Generator",
};

const LOCKED_STATUSES = ["partially_signed", "completed", "voided"];

export default async function PlacementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: document } = await supabase
    .from("documents")
    .select("id, title, source, status, upload_page_count")
    .eq("id", id)
    .single();

  if (!document) {
    notFound();
  }

  if (document.source !== "upload") {
    redirect(`/documents/${id}/edit`);
  }

  const { data: partyRows } = await supabase
    .from("document_parties")
    .select("role, full_name, email")
    .eq("document_id", id)
    .order("sort_order");
  const parties = partyRows ?? [];
  const uploaderParty = parties.find((p) => p.role === "uploader");
  const counterpartyParty = parties.find((p) => p.role === "counterparty");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user?.id ?? "")
    .single();

  const uploaderName =
    uploaderParty?.full_name ?? profile?.full_name?.trim() ?? profile?.email ?? "You";

  const { data: placementRows } = await supabase
    .from("signature_placements")
    .select("party_role, field_type, page_number, x, y, width, height")
    .eq("document_id", id)
    .order("page_number");

  const initialPlacements: PlacementInput[] = (placementRows ?? [])
    .filter((p) => p.party_role === "uploader" || p.party_role === "counterparty")
    .map((p) => ({
      role: p.party_role as "uploader" | "counterparty",
      fieldType: (p.field_type === "date" ? "date" : "signature") as "signature" | "date",
      pageNumber: p.page_number,
      x: Number(p.x),
      y: Number(p.y),
      width: Number(p.width),
      height: Number(p.height),
    }));

  const locked = LOCKED_STATUSES.includes(document.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
            ← Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{document.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Uploaded PDF · {document.upload_page_count ?? "?"} page
            {document.upload_page_count === 1 ? "" : "s"} · status: {document.status}
          </p>
        </div>
        <Link
          href={`/documents/${id}/preview`}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Continue to preview →
        </Link>
      </div>

      {locked && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {document.status === "voided"
            ? "This document has been voided and can no longer be edited."
            : "This document already has a signature on it and is locked — recipients and placements can no longer be changed."}
        </div>
      )}

      <PlacementEditor
        documentId={id}
        pageCount={document.upload_page_count ?? 1}
        pdfUrl={`/documents/${id}/upload-file`}
        uploaderName={uploaderName}
        initialCounterpartyName={counterpartyParty?.full_name ?? ""}
        initialCounterpartyEmail={counterpartyParty?.email ?? ""}
        initialPlacements={initialPlacements}
        locked={locked}
      />
    </div>
  );
}
