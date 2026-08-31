"use client";

import { SIGNATURE_STYLES, type SignatureStyle } from "@/lib/nda/signature-styles";

/**
 * Shown once a signer has typed their name: previews it in a handful of
 * handwriting fonts so they can pick which one becomes their signature.
 * Used by both the owner-side and public counterparty sign forms.
 */
export function SignaturePicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: SignatureStyle;
  onChange: (style: SignatureStyle) => void;
}) {
  const previewName = name.trim() || "Your signature";

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-zinc-700">Choose your signature style</p>
      <div className="grid grid-cols-2 gap-2">
        {SIGNATURE_STYLES.map((style) => {
          const selected = value === style.id;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onChange(style.id)}
              aria-pressed={selected}
              className={`rounded-md border px-3 py-3 text-left transition-colors ${
                selected
                  ? "border-zinc-900 bg-zinc-900/5 ring-1 ring-zinc-900"
                  : "border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <span
                className="block truncate text-2xl leading-tight text-zinc-900"
                style={{ fontFamily: style.cssFontFamily }}
              >
                {previewName}
              </span>
              <span className="mt-1.5 block text-xs text-zinc-500">{style.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
