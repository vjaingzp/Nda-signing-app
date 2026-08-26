import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    .select("id, title, nda_type, template_slug, status")
    .eq("id", id)
    .single();

  if (!document) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          {document.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {document.nda_type === "mutual" ? "Mutual" : "One-way"} NDA · template:{" "}
          {document.template_slug} · status: {document.status}
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
        <p className="text-sm text-zinc-500">
          The details form and clause editor are being built next.
        </p>
      </div>
    </div>
  );
}
