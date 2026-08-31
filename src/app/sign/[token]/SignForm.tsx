"use client";

import { useActionState, useState } from "react";
import { submitSignature, type SignActionState } from "./actions";
import { inputClassName } from "@/components/ui/form-field";
import { DemoSignatureNotice } from "@/components/ui/demo-signature-notice";
import { SignaturePicker } from "@/components/nda/SignaturePicker";
import { DEFAULT_SIGNATURE_STYLE, type SignatureStyle } from "@/lib/nda/signature-styles";

const initialState: SignActionState = {};

export function SignForm({
  token,
  partyLabel,
  defaultName,
}: {
  token: string;
  partyLabel: string;
  defaultName: string;
}) {
  const action = submitSignature.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [consentChecked, setConsentChecked] = useState(false);
  const [signerName, setSignerName] = useState(defaultName);
  const [signatureStyle, setSignatureStyle] = useState<SignatureStyle>(DEFAULT_SIGNATURE_STYLE);

  if (state.success) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-green-300 bg-green-50 p-6 text-center">
        <p className="font-medium text-green-900">You&apos;ve signed as {partyLabel}.</p>
        <p className="text-sm text-green-800">Thank you — no further action is needed.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="font-semibold text-zinc-900">Sign as {partyLabel}</h2>

      <DemoSignatureNotice />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signerName" className="text-sm font-medium text-zinc-700">
          Your full name
        </label>
        <input
          id="signerName"
          name="signerName"
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          className={inputClassName}
          required
        />
        <p className="text-xs text-zinc-500">
          Typing your name and choosing a style below is what becomes your
          signature.
        </p>
      </div>

      <input type="hidden" name="signatureStyle" value={signatureStyle} />
      <SignaturePicker name={signerName} value={signatureStyle} onChange={setSignatureStyle} />

      <label className="flex items-start gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="consent"
          checked={consentChecked}
          onChange={(e) => setConsentChecked(e.target.checked)}
          className="mt-0.5"
          required
        />
        I have read the agreement above and consent to sign it electronically.
        I understand this constitutes my signature.
      </label>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || !consentChecked}
        className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Signing…" : "Sign document"}
      </button>
    </form>
  );
}
