"use client";

import { useActionState } from "react";
import { simulatePayment, type PaymentActionState } from "./actions";

const initialState: PaymentActionState = {};

export function PaymentForm({ documentId }: { documentId: string }) {
  const action = simulatePayment.bind(null, documentId);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-green-300 bg-green-50 p-6 text-center">
        <p className="font-medium text-green-900">✓ Test payment complete</p>
        <p className="text-sm text-green-800">
          You can now generate a signing link for the counterparty.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Processing test payment…" : "Simulate payment — ₹499 (no real charge)"}
      </button>
    </form>
  );
}
