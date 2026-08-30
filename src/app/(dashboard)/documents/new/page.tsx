import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { NdaType } from "@/types/database";
import { NewDocumentWizard } from "./NewDocumentWizard";

export const metadata: Metadata = {
  title: "New NDA | NDA Generator",
};

export default async function NewDocumentPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("templates")
    .select("slug, name, description, supports_type")
    .eq("is_active", true)
    .order("sort_order");

  const items = (templates ?? []) as {
    slug: string;
    name: string;
    description: string | null;
    supports_type: NdaType[];
  }[];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Start a new NDA</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Choose the type of NDA and a starter template. You&apos;ll fill in the
          details next.{" "}
          <Link href="/documents/upload" className="font-medium underline">
            Or upload your own PDF instead
          </Link>
          .
        </p>
      </div>

      <NewDocumentWizard templates={items} />
    </div>
  );
}
