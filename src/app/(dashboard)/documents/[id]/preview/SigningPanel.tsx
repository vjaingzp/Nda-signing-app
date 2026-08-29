"use client";

import { useActionState, useState } from "react";
import { generateSigningLink, signAsOwner, type SignActionState } from "../sign-actions";
import { inputClassName } from "@/components/ui/form-field";
import { DemoSignatureNotice } from "@/components/ui/demo-signature-notice";
import { formatDateTime } from "@/lib/nda/render-clause";

const initialState: SignActionState = {};

interface PartyStatus {
  label: string;
  fullName: string;
  signerName: string | null;
  signedAt: string | null;
}

function OwnerSignForm({
  documentId,
  party,
}: {
  documentId: string;
  party: PartyStatus;
}) {
  const action = signAsOwner.bind(null, documentId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [consentChecked, setConsentChecked] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ownerSignerName" className="text-sm font-medium text-zinc-700">
          Your full name
        </label>
        <input
          id="ownerSignerName"
          name="signerName"
          type="text"
          defaultValue={party.fullName}
          className={inputClassName}
          required
        />
      </div>

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

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={pending || !consentChecked}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Signing…" : `Sign as ${party.label}`}
        </button>
      </div>
    </form>
  );
}

function GenerateLinkButton({ documentId }: { documentId: string }) {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async () => {
        setPending(true);
        await generateSigningLink(documentId);
        setPending(false);
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
      >
        {pending ? "Generating…" : "Generate signing link"}
      </button>
    </form>
  );
}

function PartyStatusRow({ party }: { party: PartyStatus }) {
  if (party.signedAt) {
    return (
      <p className="text-sm text-green-700">
        ✓ {party.label} signed by {party.signerName} on {formatDateTime(party.signedAt)}
      </p>
    );
  }
  return <p className="text-sm text-zinc-500">{party.label} hasn&apos;t signed yet.</p>;
}

export function SigningPanel({
  documentId,
  status,
  ownerParty,
  counterpartyParty,
  signingLinkUrl,
}: {
  documentId: string;
  status: string;
  ownerParty: PartyStatus;
  counterpartyParty: PartyStatus;
  signingLinkUrl: string | null;
}) {
  if (status === "completed") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-green-300 bg-green-50 p-6">
        <p className="font-medium text-green-900">✅ Fully signed</p>
        <PartyStatusRow party={ownerParty} />
        <PartyStatusRow party={counterpartyParty} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="font-semibold text-zinc-900">Signing</h2>
      <DemoSignatureNotice />

      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
        <p className="text-sm font-medium text-zinc-700">{ownerParty.label} (you)</p>
        {ownerParty.signedAt ? (
          <PartyStatusRow party={ownerParty} />
        ) : (
          <OwnerSignForm documentId={documentId} party={ownerParty} />
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
        <p className="text-sm font-medium text-zinc-700">{counterpartyParty.label}</p>
        {counterpartyParty.signedAt ? (
          <PartyStatusRow party={counterpartyParty} />
        ) : signingLinkUrl ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-zinc-500">
              Share this link with {counterpartyParty.fullName || "the counterparty"} to
              sign — no account needed on their end.
            </p>
            <input
              readOnly
              value={signingLinkUrl}
              onFocus={(e) => e.currentTarget.select()}
              className={`${inputClassName} font-mono text-xs`}
            />
          </div>
        ) : (
          <GenerateLinkButton documentId={documentId} />
        )}
      </div>
    </div>
  );
}
