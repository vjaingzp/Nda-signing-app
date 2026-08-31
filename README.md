# NDA Generator & E-Signing Tool

Generate a one-way or mutual NDA from a starter template — or upload your
own PDF — edit it, preview it, and send it out for a simulated e-signature
through a shareable link that needs no account on the other end.

**Live demo:** [nda-signing-app.vercel.app](https://nda-signing-app.vercel.app)
— click **Try the demo** on the landing page for a one-click login, or sign
in manually with:

- **Email:** `demo@nda-generator.dev`
- **Password:** `NdaDemo2026!`

It's a shared, publicly-writable account seeded with two example
documents (one draft, one fully signed) — don't put anything in it you'd
mind a stranger changing.

This is a **portfolio/demo project**, not a live paid product: payment and
e-signing are realistic simulated flows, not real payment or e-signature
integrations (see [Design decisions](#design-decisions)). Governing law is
fixed to India across every template.

## Features

- Generate an NDA from 5 starter templates (freelancer/client, business
  partnership, employer/employee, startup/investor, vendor agreement), or
  upload any PDF of your own
- Guided editing of core clauses, free-text editing/reordering/removal of
  optional clauses
- Full document preview before sending
- A simulated payment step gates sending a document out for signature
- A tokenized signing link the counterparty can open and sign without
  creating an account
- Server-generated, downloadable PDF — live-rendered until signed, then a
  frozen snapshot of exactly what was signed
- A document locks the moment either party signs — no silent edits to
  something someone has already agreed to
- Signed documents' stored files are automatically deleted 30 days after
  completion, with an in-app reminder starting a week out

## Design decisions

**Guided editing, not a blank text box.** Core clauses (the ones that make
an NDA an NDA — confidentiality definition, obligations, term, governing
law) are edited through structured fields, not free text, so a user can't
accidentally invalidate the clause by mis-editing its legal substance.
Optional clauses (non-solicitation, publicity, etc.) can be freely edited,
reordered, or removed, since altering or dropping those doesn't change what
the document fundamentally is.

**The document locks on the first signature, not the last.** Once either
party has signed, both the clause editor and the agreement-details form
refuse further writes server-side — not just in the UI. Letting the owner
keep editing after one party has already signed would mean the counterparty
signed something that can silently change out from under them. If a signed
document genuinely needs a change, the correct path is to void it and start
over, not edit it in place.

**Payment and e-signature are simulated.** There's a "Simulate payment"
button instead of a real payment processor, and typing your name plus a
consent checkbox instead of a real e-signature provider (e.g. India's
Aadhaar eSign). Every screen involved says so explicitly. This is a
portfolio piece meant to demonstrate the product and engineering thinking
around a document-signing flow — payment processing and legally-binding
e-signatures are regulated, provider-specific integrations that are out of
scope for a demo.

**Storage retention has a real cost model behind it.** Signed PDFs live in
Supabase Storage (free tier), which is finite. Rather than keep every
signed document forever, a document's stored file is deleted 30 days after
it's completed — not 30 days after it was created, so time spent sitting as
an unfinished draft doesn't eat into that window. The `documents` row and
its full signature/audit history are kept indefinitely; only the file bytes
are reclaimed. For an uploaded document this is genuinely irreversible (no
clause data to regenerate a stamped PDF from), which is why the dashboard
and preview page start showing a reminder 7 days out.

## Demo account

Credentials are at the top of this README. See [Setup](#setup) below for
how to (re)create the account and its two seeded documents.

## Tech stack

- **Next.js 16 (App Router) + React 19 + TypeScript** — Server Components,
  Server Actions for all mutations, one API route for the cron sweep
- **Postgres via Supabase** (free tier) — auth, database (RLS on every
  table), private Storage buckets
- **Tailwind CSS 4** — styling
- **Zod + React Hook Form** — form validation
- **pdf-lib** — server-side PDF generation and signature-field stamping
- **pdfjs-dist** — client-side PDF rendering for the upload placement editor
- **Vercel** (free tier) — hosting + Cron for the retention sweep

## Project structure

```
src/
  app/
    (auth)/login, (auth)/signup        # account pages + demo login action
    (dashboard)/dashboard              # signed-in user's document list
    (dashboard)/documents/new          # nda type + template + details wizard
    (dashboard)/documents/upload       # "upload your own agreement" flow
    (dashboard)/documents/[id]/edit    # clause editor (Server Actions)
    (dashboard)/documents/[id]/placements # click-to-place editor for uploads
    (dashboard)/documents/[id]/preview # full document preview + signing panel
    (dashboard)/documents/[id]/payment # simulated payment step
    (dashboard)/documents/[id]/pdf     # serves the current/frozen PDF
    sign/[token]                       # no-login counterparty signing flow
    api/cron/cleanup-expired-documents # the only real API route — the
                                        # 30-day storage retention sweep;
                                        # everything else above is Server
                                        # Actions, not a separate route
  lib/
    supabase/client.ts                 # browser Supabase client
    supabase/server.ts                 # server (RSC/route handler) client, RLS applies
    supabase/admin.ts                  # service-role client, bypasses RLS
    supabase/middleware.ts             # session refresh + route protection
    nda/                               # clause rendering, PDF generation/
                                        # stamping, retention math, templates
  components/
    ui/                                # generic UI primitives
    nda/                               # NDA-specific components (DocumentCard, etc.)
  types/database.ts                    # hand-written types mirroring the SQL schema
supabase/
  migrations/                          # 0001 full schema/RLS/buckets, plus
                                        # incremental migrations after it
  seed/seed.sql                        # starter templates + default clause library
vercel.json                            # cron schedule for the retention sweep
```

## Data model

See [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
for the full schema with comments. Highlights:

- `profiles` — 1:1 with Supabase `auth.users`, auto-created on signup via trigger.
- `templates` / `clause_library` — the 5 starter templates and their default
  clauses (core = guided-fields-only, optional = fully editable/removable).
- `documents` — one row per NDA (template-generated or uploaded PDF).
  `expires_at` defaults to `created_at + 30 days` but is overwritten to
  `finalized_at + 30 days` once a document is fully signed — see
  [Design decisions](#design-decisions) above.
- `document_parties`, `document_clauses` — per-document snapshot of parties
  and clause text, so edits never mutate the shared template library.
- `signature_placements` — marked signature/date locations, used for both
  generated and uploaded PDFs.
- `signing_links` — tokenized shareable links for counterparty signing.
- `signatures` — the simulated e-signature event (name, consent, timestamp).
- `payments` — simulated payment record (test/demo mode only).

RLS is enabled on every table; owners can manage their own documents and
everything nested under them. The no-login counterparty signing flow
validates the `signing_links` token in a server route and uses the
service-role client (`src/lib/supabase/admin.ts`) rather than a public RLS
policy, so documents stay un-enumerable.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier).
2. **Run the schema**: open the SQL editor in your Supabase project and run
   each file in `supabase/migrations/` in order (`0001_init.sql`,
   `0002_signing_party_id.sql`, `0003_void_status.sql`,
   `0004_payment_amount.sql`), then `supabase/seed/seed.sql`.
3. **Storage buckets** (`uploaded-agreements`, `signed-documents`, both
   private) are created for you by `0001_init.sql`.
4. **Copy env vars**: `cp .env.local.example .env.local` and fill in your
   Supabase project URL, anon key, and service role key from Project
   Settings → API, plus a random `CRON_SECRET` and a `DEMO_USER_EMAIL` /
   `DEMO_USER_PASSWORD` of your choice.
5. **Create the demo account** (optional, for the "Try the demo" button):
   sign up normally through the app with the email/password you chose
   above, then use it to create a couple of example documents — one left
   as a draft, one carried all the way through payment and both
   signatures — the same way any user would.
6. **Install & run**:

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deploy to Vercel and set the same environment variables from
`.env.local.example` in the Vercel project settings, including
`CRON_SECRET` and the `DEMO_USER_*` pair. Vercel Cron picks up the daily
retention sweep automatically from `vercel.json` once `CRON_SECRET` is set.

## Storage retention

Once a document is fully signed, its stored PDF (and, for an uploaded
document, the original file) is deleted from Storage 30 days later —
`documents.expires_at` is set to `finalized_at + 30 days` at the moment it
completes. The `documents` row itself, along with its parties, signatures,
and payment history, is kept indefinitely as an audit trail; only the file
bytes are removed. The dashboard and a document's preview page show a
reminder banner starting 7 days before deletion so there's time to download
a copy first.

The sweep runs as the `GET /api/cron/cleanup-expired-documents` route,
scheduled daily via `vercel.json`. It only responds to requests carrying
`Authorization: Bearer <CRON_SECRET>` — set the same `CRON_SECRET` value in
your Vercel project's environment variables and Vercel Cron will send it
automatically. (Supabase's own `pg_cron` is an alternative if you'd rather
run the sweep from the database instead.)

To trigger it manually during local development:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/cleanup-expired-documents
```
