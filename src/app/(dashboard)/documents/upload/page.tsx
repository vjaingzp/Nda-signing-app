import type { Metadata } from "next";
import Link from "next/link";
import { UploadForm } from "./UploadForm";

export const metadata: Metadata = {
  title: "Upload agreement | NDA Generator",
};

export default function UploadDocumentPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Upload your own agreement
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload any PDF — not just NDAs. You&apos;ll mark where signatures and
          dates go next, then send it for signature the same way.
        </p>
      </div>

      <div className="max-w-md rounded-xl border border-zinc-200 bg-white p-6">
        <UploadForm />
      </div>
    </div>
  );
}
