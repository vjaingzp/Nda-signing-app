"use client";

import { useActionState, useState } from "react";
import { saveDocumentDetails, type DetailsActionState } from "./actions";
import { FormField, inputClassName } from "@/components/ui/form-field";
import type { NdaType, PartyType } from "@/types/database";

interface PartyDefaults {
  partyType: PartyType;
  fullName: string;
  companyName: string;
  address: string;
  email: string;
}

interface DetailsFormProps {
  documentId: string;
  ndaType: NdaType;
  effectiveDate: string;
  termMonths: string;
  partyA?: PartyDefaults;
  partyB?: PartyDefaults;
}

const initialState: DetailsActionState = {};

const emptyParty: PartyDefaults = {
  partyType: "individual",
  fullName: "",
  companyName: "",
  address: "",
  email: "",
};

function PartySection({
  prefix,
  title,
  description,
  defaults,
  fieldErrors,
}: {
  prefix: "partyA" | "partyB";
  title: string;
  description: string;
  defaults: PartyDefaults;
  fieldErrors?: Record<string, string>;
}) {
  const [partyType, setPartyType] = useState<PartyType>(defaults.partyType);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
      <div>
        <h3 className="font-medium text-zinc-900">{title}</h3>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>

      <FormField label="Type" htmlFor={`${prefix}Type`}>
        <div className="flex gap-4">
          {(["individual", "business"] as const).map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="radio"
                name={`${prefix}Type`}
                value={option}
                checked={partyType === option}
                onChange={() => setPartyType(option)}
              />
              {option === "individual" ? "Individual" : "Business"}
            </label>
          ))}
        </div>
      </FormField>

      <FormField
        label={partyType === "business" ? "Signatory full name" : "Full name"}
        htmlFor={`${prefix}FullName`}
        error={fieldErrors?.[`${prefix}FullName`]}
      >
        <input
          id={`${prefix}FullName`}
          name={`${prefix}FullName`}
          type="text"
          defaultValue={defaults.fullName}
          className={inputClassName}
          required
        />
      </FormField>

      {partyType === "business" && (
        <FormField
          label="Business name"
          htmlFor={`${prefix}CompanyName`}
          error={fieldErrors?.[`${prefix}CompanyName`]}
        >
          <input
            id={`${prefix}CompanyName`}
            name={`${prefix}CompanyName`}
            type="text"
            defaultValue={defaults.companyName}
            className={inputClassName}
            required
          />
        </FormField>
      )}

      <FormField
        label="Address"
        htmlFor={`${prefix}Address`}
        error={fieldErrors?.[`${prefix}Address`]}
      >
        <input
          id={`${prefix}Address`}
          name={`${prefix}Address`}
          type="text"
          defaultValue={defaults.address}
          className={inputClassName}
          required
        />
      </FormField>

      <FormField label="Email" htmlFor={`${prefix}Email`} error={fieldErrors?.[`${prefix}Email`]}>
        <input
          id={`${prefix}Email`}
          name={`${prefix}Email`}
          type="email"
          defaultValue={defaults.email}
          className={inputClassName}
          required
        />
      </FormField>
    </div>
  );
}

export function DetailsForm({
  documentId,
  ndaType,
  effectiveDate,
  termMonths,
  partyA,
  partyB,
}: DetailsFormProps) {
  const action = saveDocumentDetails.bind(null, documentId);
  const [state, formAction, pending] = useActionState(action, initialState);

  const [partyALabel, partyADescription, partyBLabel, partyBDescription] =
    ndaType === "mutual"
      ? [
          "Party A",
          "This party will both disclose and receive confidential information.",
          "Party B",
          "This party will both disclose and receive confidential information.",
        ]
      : [
          "Disclosing Party",
          "The party sharing confidential information.",
          "Receiving Party",
          "The party receiving confidential information.",
        ];

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="font-medium text-zinc-900">Agreement details</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Effective date"
            htmlFor="effectiveDate"
            error={state.fieldErrors?.effectiveDate}
          >
            <input
              id="effectiveDate"
              name="effectiveDate"
              type="date"
              defaultValue={effectiveDate}
              className={inputClassName}
              required
            />
          </FormField>
          <FormField
            label="Confidentiality term (months)"
            htmlFor="termMonths"
            error={state.fieldErrors?.termMonths}
          >
            <input
              id="termMonths"
              name="termMonths"
              type="number"
              min={1}
              step={1}
              defaultValue={termMonths}
              className={inputClassName}
              required
            />
          </FormField>
        </div>
        <p className="mt-4 text-sm text-zinc-500">
          Governing law: <span className="font-medium text-zinc-700">India</span> (fixed for all
          agreements)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PartySection
          prefix="partyA"
          title={partyALabel}
          description={partyADescription}
          defaults={partyA ?? emptyParty}
          fieldErrors={state.fieldErrors}
        />
        <PartySection
          prefix="partyB"
          title={partyBLabel}
          description={partyBDescription}
          defaults={partyB ?? emptyParty}
          fieldErrors={state.fieldErrors}
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Details saved.
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save details"}
        </button>
      </div>
    </form>
  );
}
