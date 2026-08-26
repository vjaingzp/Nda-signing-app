"use client";

import { useActionState, useState } from "react";
import { createDraftDocument, type NewDocumentActionState } from "./actions";
import { NDA_TYPE_OPTIONS } from "@/lib/nda/templates";
import type { NdaType } from "@/types/database";

interface TemplateOption {
  slug: string;
  name: string;
  description: string | null;
  supports_type: NdaType[];
}

const initialState: NewDocumentActionState = {};

export function NewDocumentWizard({ templates }: { templates: TemplateOption[] }) {
  const [ndaType, setNdaType] = useState<NdaType | null>(null);
  const [templateSlug, setTemplateSlug] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    createDraftDocument,
    initialState
  );

  const availableTemplates = ndaType
    ? templates.filter((t) => t.supports_type.includes(ndaType))
    : [];

  function handleSelectType(value: NdaType) {
    setNdaType(value);
    if (templateSlug) {
      const stillAvailable = templates
        .filter((t) => t.supports_type.includes(value))
        .some((t) => t.slug === templateSlug);
      if (!stillAvailable) setTemplateSlug(null);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-10">
      <input type="hidden" name="ndaType" value={ndaType ?? ""} />
      <input type="hidden" name="templateSlug" value={templateSlug ?? ""} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-700">
          1. What type of NDA do you need?
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {NDA_TYPE_OPTIONS.map((option) => {
            const selected = ndaType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelectType(option.value)}
                aria-pressed={selected}
                className={`rounded-xl border p-5 text-left transition-colors ${
                  selected
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white hover:border-zinc-400"
                }`}
              >
                <p className="font-medium">{option.label}</p>
                <p
                  className={`mt-1 text-sm ${
                    selected ? "text-zinc-300" : "text-zinc-500"
                  }`}
                >
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {ndaType && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-700">
            2. Choose a starter template
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {availableTemplates.map((template) => {
              const selected = templateSlug === template.slug;
              return (
                <button
                  key={template.slug}
                  type="button"
                  onClick={() => setTemplateSlug(template.slug)}
                  aria-pressed={selected}
                  className={`rounded-xl border p-5 text-left transition-colors ${
                    selected
                      ? "border-zinc-900 ring-1 ring-zinc-900"
                      : "border-zinc-200 bg-white hover:border-zinc-400"
                  }`}
                >
                  <p className="font-medium text-zinc-900">{template.name}</p>
                  {template.description && (
                    <p className="mt-1 text-sm text-zinc-500">
                      {template.description}
                    </p>
                  )}
                </button>
              );
            })}
            {availableTemplates.length === 0 && (
              <p className="text-sm text-zinc-500">
                No templates available for this NDA type yet.
              </p>
            )}
          </div>
        </section>
      )}

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={!ndaType || !templateSlug || pending}
          className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Creating…" : "Continue"}
        </button>
      </div>
    </form>
  );
}
