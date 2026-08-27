import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { NdaType } from "@/types/database";
import { DetailsForm } from "./DetailsForm";

export const metadata: Metadata = {
  title: "Edit NDA | NDA Generator",
};

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("documents")
    .select("id, title, nda_type, template_slug, status, effective_date, term_months")
    .eq("id", id)
    .single();

  if (!document) {
    notFound();
  }

  const { data: parties } = await supabase
    .from("document_parties")
    .select("party_type, full_name, company_name, address, email, sort_order")
    .eq("document_id", id)
    .order("sort_order");

  const partyA = parties?.[0]
    ? {
        partyType: parties[0].party_type,
        fullName: parties[0].full_name,
        companyName: parties[0].company_name ?? "",
        address: parties[0].address ?? "",
        email: parties[0].email ?? "",
      }
    : undefined;
  const partyB = parties?.[1]
    ? {
        partyType: parties[1].party_type,
        fullName: parties[1].full_name,
        companyName: parties[1].company_name ?? "",
        address: parties[1].address ?? "",
        email: parties[1].email ?? "",
      }
    : undefined;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{document.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {document.nda_type === "mutual" ? "Mutual" : "One-way"} NDA · template:{" "}
          {document.template_slug} · status: {document.status}
        </p>
      </div>

      <DetailsForm
        documentId={document.id}
        ndaType={document.nda_type as NdaType}
        effectiveDate={document.effective_date ?? today}
        termMonths={document.term_months?.toString() ?? ""}
        partyA={partyA}
        partyB={partyB}
      />
    </div>
  );
}
