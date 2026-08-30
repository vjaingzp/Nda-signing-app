"use client";

import { useActionState } from "react";
import { voidDocument, type VoidActionState } from "./void-actions";

const initialState: VoidActionState = {};

export function VoidDocumentButton({ documentId }: { documentId: string }) {
  const action = voidDocument.bind(null, documentId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const confirmed = confirm(
          "Void this document? This can't be undone. Any signature already collected will no longer apply to a live agreement — you'll need to start a new document."
        );
        if (!confirmed) e.preventDefault();
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="text-sm font-medium text-red-700 underline hover:text-red-800 disabled:opacity-50"
      >
        {pending ? "Voiding…" : "Void this document and start over"}
      </button>
      {state.error && <p className="mt-1 text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
