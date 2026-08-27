"use client";

import { useActionState, useEffect, useState } from "react";
import {
  addCustomClause,
  moveClause,
  removeClause,
  saveGuidedFields,
  saveOptionalClauseText,
  type ClauseActionState,
} from "./clause-actions";
import { inputClassName } from "@/components/ui/form-field";
import type { ClauseCategory, GuidedField } from "@/types/database";

export interface ClauseItem {
  id: string;
  clauseKey: string;
  title: string;
  category: ClauseCategory;
  body: string;
  renderedBody: string;
  guidedFieldValues: Record<string, unknown>;
  guidedFields: GuidedField[];
  isRemovable: boolean;
}

const initialState: ClauseActionState = {};

function fieldValue(field: GuidedField, values: Record<string, unknown>): string {
  const raw = values[field.key];
  return typeof raw === "string" && raw.length > 0 ? raw : field.default ?? "";
}

function CoreEditPanel({
  documentId,
  clause,
  onDone,
}: {
  documentId: string;
  clause: ClauseItem;
  onDone: () => void;
}) {
  const action = saveGuidedFields.bind(null, documentId, clause.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  if (clause.guidedFields.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-sm text-zinc-500">
          This clause is standard for every agreement and has no editable
          fields.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="mt-3 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-white"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      {clause.guidedFields.map((field) => (
        <div key={field.key} className="flex flex-col gap-1.5">
          <label htmlFor={`${clause.id}-${field.key}`} className="text-sm font-medium text-zinc-700">
            {field.label}
          </label>
          {field.type === "textarea" ? (
            <textarea
              id={`${clause.id}-${field.key}`}
              name={field.key}
              rows={2}
              placeholder={field.placeholder}
              defaultValue={fieldValue(field, clause.guidedFieldValues)}
              className={inputClassName}
            />
          ) : (
            <input
              id={`${clause.id}-${field.key}`}
              name={field.key}
              type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
              placeholder={field.placeholder}
              defaultValue={fieldValue(field, clause.guidedFieldValues)}
              className={inputClassName}
            />
          )}
        </div>
      ))}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function OptionalEditPanel({
  documentId,
  clause,
  onDone,
}: {
  documentId: string;
  clause: ClauseItem;
  onDone: () => void;
}) {
  const action = saveOptionalClauseText.bind(null, documentId, clause.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${clause.id}-title`} className="text-sm font-medium text-zinc-700">
          Title
        </label>
        <input
          id={`${clause.id}-title`}
          name="title"
          type="text"
          defaultValue={clause.title}
          className={inputClassName}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${clause.id}-body`} className="text-sm font-medium text-zinc-700">
          Text
        </label>
        <textarea
          id={`${clause.id}-body`}
          name="body"
          rows={4}
          defaultValue={clause.body}
          className={inputClassName}
          required
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ClauseRow({
  documentId,
  index,
  clause,
  editing,
  onEdit,
  onDone,
  canMoveUp,
  canMoveDown,
}: {
  documentId: string;
  index: number;
  clause: ClauseItem;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  return (
    <div className="border-b border-zinc-200 py-6 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-medium text-zinc-900">
          {index + 1}. {clause.title}
        </h3>
        {!editing && (
          <div className="flex shrink-0 items-center gap-3">
            {clause.category === "optional" && (
              <>
                <form action={moveClause.bind(null, documentId, clause.id, "up")}>
                  <button
                    type="submit"
                    disabled={!canMoveUp}
                    aria-label="Move up"
                    className="text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
                  >
                    ↑
                  </button>
                </form>
                <form action={moveClause.bind(null, documentId, clause.id, "down")}>
                  <button
                    type="submit"
                    disabled={!canMoveDown}
                    aria-label="Move down"
                    className="text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
                  >
                    ↓
                  </button>
                </form>
              </>
            )}
            <button
              type="button"
              onClick={onEdit}
              className="text-xs font-medium text-zinc-400 hover:text-zinc-700"
            >
              Edit
            </button>
            {clause.isRemovable && (
              <form action={removeClause.bind(null, documentId, clause.id)}>
                <button
                  type="submit"
                  className="text-xs font-medium text-zinc-400 hover:text-red-600"
                >
                  Remove
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-3">
          {clause.category === "core" ? (
            <CoreEditPanel documentId={documentId} clause={clause} onDone={onDone} />
          ) : (
            <OptionalEditPanel documentId={documentId} clause={clause} onDone={onDone} />
          )}
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-700">
          {clause.renderedBody}
        </p>
      )}
    </div>
  );
}

function AddClauseForm({ documentId, onDone }: { documentId: string; onDone: () => void }) {
  const action = addCustomClause.bind(null, documentId);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-clause-title" className="text-sm font-medium text-zinc-700">
          Title
        </label>
        <input
          id="new-clause-title"
          name="title"
          type="text"
          placeholder="e.g. Force Majeure"
          className={inputClassName}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-clause-body" className="text-sm font-medium text-zinc-700">
          Text
        </label>
        <textarea
          id="new-clause-body"
          name="body"
          rows={4}
          placeholder="Write the clause text…"
          className={inputClassName}
          required
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add clause"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ClausesEditor({
  documentId,
  clauses,
}: {
  documentId: string;
  clauses: ClauseItem[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  const optionalIds = clauses.filter((c) => c.category === "optional").map((c) => c.id);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-6">
      {clauses.map((clause, index) => {
        const optionalIndex = optionalIds.indexOf(clause.id);
        return (
          <ClauseRow
            key={clause.id}
            documentId={documentId}
            index={index}
            clause={clause}
            editing={editingId === clause.id}
            onEdit={() => setEditingId(clause.id)}
            onDone={() => setEditingId(null)}
            canMoveUp={optionalIndex > 0}
            canMoveDown={optionalIndex !== -1 && optionalIndex < optionalIds.length - 1}
          />
        );
      })}

      <div className="py-6">
        {addingNew ? (
          <AddClauseForm documentId={documentId} onDone={() => setAddingNew(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setAddingNew(true)}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            + Add a clause
          </button>
        )}
      </div>
    </div>
  );
}
