"use client";

import { useActionState } from "react";
import { uploadAgreement, type UploadActionState } from "./actions";
import { FormField, inputClassName } from "@/components/ui/form-field";

const initialState: UploadActionState = {};

export function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadAgreement, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormField label="Title (optional)" htmlFor="title">
        <input
          id="title"
          name="title"
          type="text"
          placeholder="Defaults to the file name"
          className={inputClassName}
        />
      </FormField>

      <FormField label="PDF file" htmlFor="file">
        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf"
          required
          className={inputClassName}
        />
        <p className="text-xs text-zinc-500">Up to 15MB.</p>
      </FormField>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Uploading…" : "Upload and continue"}
        </button>
      </div>
    </form>
  );
}
