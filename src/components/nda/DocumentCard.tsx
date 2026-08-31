import { formatDateTime } from "@/lib/nda/render-clause";
import { signatureStyleDef } from "@/lib/nda/signature-styles";

export interface DocumentCardParty {
  label: string;
  description: string;
  signerName: string | null;
  signedAt: string | null;
  signatureStyle?: string | null;
}

export interface DocumentCardClause {
  id: string;
  title: string;
  renderedBody: string;
}

export function DocumentCard({
  effectiveDateText,
  parties,
  clauses,
}: {
  effectiveDateText: string;
  parties: DocumentCardParty[];
  clauses: DocumentCardClause[];
}) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl border border-zinc-200 bg-white p-10 shadow-sm sm:p-14">
      <div className="font-serif text-zinc-900">
        <h2 className="text-center text-xl font-bold tracking-wide">
          NON-DISCLOSURE AGREEMENT
        </h2>

        <p className="mt-8 leading-relaxed">
          This Non-Disclosure Agreement (the &quot;Agreement&quot;) is made and
          entered into on {effectiveDateText}, by and between:
        </p>

        <ul className="mt-4 flex flex-col gap-2 leading-relaxed">
          {parties.map((party, index) => (
            <li key={index}>
              <span className="font-semibold">{party.label}:</span>{" "}
              {party.description}.
            </li>
          ))}
        </ul>

        <p className="mt-4 leading-relaxed">
          (each a &quot;Party&quot; and, collectively, the &quot;Parties&quot;).
        </p>

        <div className="mt-10 flex flex-col gap-6">
          {clauses.map((clause, index) => (
            <div key={clause.id}>
              <h3 className="font-semibold">
                {index + 1}. {clause.title}
              </h3>
              <p className="mt-1 whitespace-pre-line leading-relaxed">
                {clause.renderedBody}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-10 leading-relaxed">
          IN WITNESS WHEREOF, the Parties have executed this Agreement as of
          the date first written above.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-2">
          {parties.map((party, index) => (
            <div key={index} className="flex flex-col gap-4">
              <p className="text-sm font-semibold">{party.label}</p>
              {party.signedAt ? (
                <>
                  <p className="text-xs font-medium uppercase tracking-wide text-green-700">
                    ✓ Signed
                  </p>
                  <div
                    className="border-b border-zinc-200 pb-2 text-3xl leading-tight text-zinc-900"
                    style={{ fontFamily: signatureStyleDef(party.signatureStyle).cssFontFamily }}
                  >
                    {party.signerName}
                  </div>
                  <div className="text-sm text-zinc-600">{party.signerName}</div>
                  <div className="text-sm text-zinc-500">
                    {formatDateTime(party.signedAt)}
                  </div>
                </>
              ) : (
                <>
                  <div className="border-b border-zinc-400 pb-1 text-sm text-zinc-400">
                    Signature
                  </div>
                  <div className="border-b border-zinc-400 pb-1 text-sm">
                    {party.signerName ?? (
                      <span className="text-zinc-400">Name not yet provided</span>
                    )}
                  </div>
                  <div className="border-b border-zinc-400 pb-1 text-sm text-zinc-400">
                    Date
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
