import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLatestPayment } from "@/lib/nda/payment";
import { formatDateTime } from "@/lib/nda/render-clause";
import { TestModeNotice } from "@/components/ui/test-mode-notice";
import { PaymentForm } from "./PaymentForm";

export const metadata: Metadata = {
  title: "Payment | NDA Generator",
};

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("documents")
    .select("id, title")
    .eq("id", id)
    .single();

  if (!document) {
    notFound();
  }

  const payment = await getLatestPayment(supabase, id);
  const isPaid = payment?.status === "succeeded";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/documents/${document.id}/preview`}
          className="text-sm text-zinc-500 hover:underline"
        >
          ← Back to preview
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{document.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Payment unlocks sending this document for signature. Creating and
          editing documents is always free.
        </p>
      </div>

      <TestModeNotice />

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold text-zinc-900">Send for signature</h2>
        <p className="mt-1 text-sm text-zinc-500">One-time fee per document</p>
        <p className="mt-4 text-3xl font-semibold text-zinc-900">
          ₹499{" "}
          <span className="align-middle text-sm font-normal text-zinc-400">
            (test amount)
          </span>
        </p>
        <ul className="mt-4 flex flex-col gap-1.5 text-sm text-zinc-600">
          <li>• Unlimited edits before you send it</li>
          <li>• A shareable signing link — no account needed for the other side</li>
          <li>• A signed PDF with names, timestamps, and an audit trail</li>
        </ul>

        <div className="mt-6">
          {isPaid ? (
            <div className="flex flex-col gap-1 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-medium">✓ Test payment complete</p>
              <p>
                Reference: <span className="font-mono">{payment.mock_reference}</span>
                {payment.completed_at && (
                  <> · {formatDateTime(payment.completed_at)}</>
                )}
              </p>
              <Link
                href={`/documents/${document.id}/preview`}
                className="mt-1 font-medium underline"
              >
                Go generate a signing link
              </Link>
            </div>
          ) : (
            <PaymentForm documentId={document.id} />
          )}
        </div>
      </div>
    </div>
  );
}
