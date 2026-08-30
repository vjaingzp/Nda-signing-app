import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { REMINDER_WINDOW_DAYS, daysUntil } from "@/lib/nda/retention";

export const metadata: Metadata = {
  title: "Dashboard | NDA Generator",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: documents } = await supabase
    .from("documents")
    .select("id, title, source, status, nda_type, created_at, expires_at, deleted_at")
    .order("created_at", { ascending: false });

  const expiringSoon = (documents ?? []).filter(
    (doc) =>
      doc.status === "completed" &&
      !doc.deleted_at &&
      daysUntil(doc.expires_at) <= REMINDER_WINDOW_DAYS
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Your documents.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/documents/upload"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Upload a PDF
          </Link>
          <Link
            href="/documents/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            New NDA
          </Link>
        </div>
      </div>

      {expiringSoon.length > 0 && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">
            {expiringSoon.length === 1
              ? "1 signed document will be deleted from storage soon."
              : `${expiringSoon.length} signed documents will be deleted from storage soon.`}
          </p>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {expiringSoon.map((doc) => {
              const days = daysUntil(doc.expires_at);
              return (
                <li key={doc.id}>
                  <Link href={`/documents/${doc.id}/preview`} className="underline">
                    {doc.title}
                  </Link>{" "}
                  — {days <= 0 ? "deletes today" : `${days} day${days === 1 ? "" : "s"} left`}
                  , download it to keep a copy.
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {documents && documents.length > 0 ? (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {documents.map((doc) => {
            const isUpload = doc.source === "upload";
            const href = isUpload
              ? `/documents/${doc.id}/placements`
              : `/documents/${doc.id}/edit`;
            const isExpiringSoon = expiringSoon.some((d) => d.id === doc.id);
            return (
              <li key={doc.id}>
                <Link
                  href={href}
                  className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-zinc-50"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{doc.title}</p>
                    <p className="text-sm text-zinc-500">
                      {isUpload
                        ? "Uploaded PDF"
                        : doc.nda_type === "mutual"
                          ? "Mutual"
                          : "One-way"}{" "}
                      · {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.deleted_at && (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                        File deleted
                      </span>
                    )}
                    {isExpiringSoon && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                        Deletes soon
                      </span>
                    )}
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium capitalize text-zinc-600">
                      {doc.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-sm text-zinc-500">No documents yet.</p>
        </div>
      )}
    </div>
  );
}
