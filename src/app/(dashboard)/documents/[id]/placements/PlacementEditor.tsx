"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePlacementSetup, type PlacementInput } from "./actions";
import { inputClassName } from "@/components/ui/form-field";

interface DraftPlacement extends PlacementInput {
  id: string;
}

interface Tool {
  role: "uploader" | "counterparty";
  fieldType: "signature" | "date";
}

const TOOLS: { tool: Tool; label: string }[] = [
  { tool: { role: "uploader", fieldType: "signature" }, label: "You — Signature" },
  { tool: { role: "uploader", fieldType: "date" }, label: "You — Date" },
  { tool: { role: "counterparty", fieldType: "signature" }, label: "Counterparty — Signature" },
  { tool: { role: "counterparty", fieldType: "date" }, label: "Counterparty — Date" },
];

const DEFAULT_WIDTH = 0.22;
const DEFAULT_HEIGHT = 0.045;

function markerStyle(role: "uploader" | "counterparty") {
  return role === "uploader"
    ? "border-blue-500 bg-blue-500/10 text-blue-700"
    : "border-purple-500 bg-purple-500/10 text-purple-700";
}

export function PlacementEditor({
  documentId,
  pageCount,
  pdfUrl,
  uploaderName,
  initialCounterpartyName,
  initialCounterpartyEmail,
  initialPlacements,
  locked,
}: {
  documentId: string;
  pageCount: number;
  pdfUrl: string;
  uploaderName: string;
  initialCounterpartyName: string;
  initialCounterpartyEmail: string;
  initialPlacements: PlacementInput[];
  locked: boolean;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);

  const [page, setPage] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [placements, setPlacements] = useState<DraftPlacement[]>(
    initialPlacements.map((p, i) => ({ ...p, id: `initial-${i}` }))
  );
  const [counterpartyName, setCounterpartyName] = useState(initialCounterpartyName);
  const [counterpartyEmail, setCounterpartyEmail] = useState(initialCounterpartyEmail);
  const [pending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const renderPage = useCallback(async (pageNumber: number) => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;

    const pdfPage = await pdf.getPage(pageNumber);
    const containerWidth = canvas.parentElement?.clientWidth ?? 700;
    const unscaledViewport = pdfPage.getViewport({ scale: 1 });
    const scale = Math.min(containerWidth / unscaledViewport.width, 1.4);
    const viewport = pdfPage.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    setCanvasSize({ width: viewport.width, height: viewport.height });

    const context = canvas.getContext("2d");
    if (!context) return;
    await pdfPage.render({ canvasContext: context, viewport, canvas }).promise;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

        const res = await fetch(pdfUrl);
        if (!res.ok) throw new Error("Couldn't load the PDF.");
        const bytes = await res.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        await renderPage(page);
      } catch {
        if (!cancelled) setLoadError("Couldn't load the PDF for preview.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl, renderPage]);

  useEffect(() => {
    if (pdfDocRef.current) renderPage(page);
  }, [page, renderPage]);

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!activeTool || locked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setPlacements((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}-${Math.random()}`,
        role: activeTool.role,
        fieldType: activeTool.fieldType,
        pageNumber: page,
        x: Math.max(0, Math.min(1 - DEFAULT_WIDTH, x - DEFAULT_WIDTH / 2)),
        y: Math.max(0, Math.min(1 - DEFAULT_HEIGHT, y - DEFAULT_HEIGHT / 2)),
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
      },
    ]);
  }

  function removePlacement(id: string) {
    setPlacements((prev) => prev.filter((p) => p.id !== id));
  }

  function handleSave() {
    setSaveError(null);
    setSaveSuccess(false);
    startTransition(async () => {
      const result = await savePlacementSetup(documentId, {
        counterpartyName,
        counterpartyEmail,
        placements: placements.map(({ ...p }) => p),
      });
      if (result.error) {
        setSaveError(result.error);
      } else {
        setSaveSuccess(true);
        router.refresh();
      }
    });
  }

  const pagePlacements = placements.filter((p) => p.pageNumber === page);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex w-full flex-col gap-4 lg:w-72">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold text-zinc-900">Recipients</h2>
          <div className="mt-3 flex flex-col gap-1">
            <p className="text-xs font-medium text-zinc-500">You (uploader)</p>
            <p className="text-sm text-zinc-700">{uploaderName}</p>
          </div>
          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="counterpartyName" className="text-xs font-medium text-zinc-500">
              Counterparty name
            </label>
            <input
              id="counterpartyName"
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
              disabled={locked}
              className={inputClassName}
              required
            />
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            <label htmlFor="counterpartyEmail" className="text-xs font-medium text-zinc-500">
              Counterparty email (optional)
            </label>
            <input
              id="counterpartyEmail"
              type="email"
              value={counterpartyEmail}
              onChange={(e) => setCounterpartyEmail(e.target.value)}
              disabled={locked}
              className={inputClassName}
            />
          </div>
        </div>

        {!locked && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="font-semibold text-zinc-900">Place fields</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Pick a field, then click on the page to drop it. Click again to
              add more.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {TOOLS.map(({ tool, label }) => {
                const isActive =
                  activeTool?.role === tool.role && activeTool?.fieldType === tool.fieldType;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setActiveTool(isActive ? null : tool)}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold text-zinc-900">Placed fields ({placements.length})</h2>
          {placements.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">None yet.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-zinc-600">
              {placements.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span>
                    Page {p.pageNumber} · {p.role === "uploader" ? "You" : "Counterparty"} ·{" "}
                    {p.fieldType}
                  </span>
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => removePlacement(p.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {!locked && (
          <div className="flex flex-col gap-2">
            {saveError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</p>
            )}
            {saveSuccess && (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save recipients & placements"}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-sm text-zinc-600">
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next →
            </button>
          </div>
          {activeTool && (
            <p className="text-xs text-zinc-500">
              Click the page to place: {activeTool.role === "uploader" ? "You" : "Counterparty"} —{" "}
              {activeTool.fieldType}
            </p>
          )}
        </div>

        {loadError ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>
        ) : (
          <div
            className="relative inline-block rounded-lg border border-zinc-300 bg-zinc-100"
            style={{ cursor: activeTool ? "crosshair" : "default" }}
            onClick={handleCanvasClick}
          >
            <canvas ref={canvasRef} className="block" />
            {canvasSize.width > 0 &&
              pagePlacements.map((p) => (
                <div
                  key={p.id}
                  className={`absolute flex items-center justify-center rounded border-2 text-[10px] font-medium ${markerStyle(
                    p.role
                  )}`}
                  style={{
                    left: p.x * canvasSize.width,
                    top: p.y * canvasSize.height,
                    width: p.width * canvasSize.width,
                    height: p.height * canvasSize.height,
                  }}
                >
                  {p.role === "uploader" ? "You" : "Counterparty"} · {p.fieldType}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
