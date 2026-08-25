# NDA Generator & E-Signing Tool

A portfolio project: generate one-way or mutual NDAs from starter templates
(or upload your own PDF), edit clauses, preview the full document, and run
it through a simulated payment + e-signature flow with a shareable signing
link — no account needed for the counterparty.

This is a **demo**, not a live paid product: payment and e-signing are
realistic simulated flows, not real payment or e-signature integrations.
Governing law is fixed to India across every template.

## Tech stack

- **Next.js (App Router) + React + TypeScript** — frontend & API routes
- **Postgres via Supabase** (free tier) — auth, database, storage
- **Tailwind CSS** — styling
- **pdf-lib** — PDF generation for signed documents and placing signature
  fields on uploaded PDFs
- **Vercel** (free tier) — deployment

## Project structure

```
src/
  app/
    (auth)/login, (auth)/signup      # account pages
    (dashboard)/dashboard            # signed-in user's document list
    documents/new                    # nda type + template + details wizard
    documents/[id]/edit              # clause editor
    documents/[id]/preview           # full document preview
    documents/[id]/payment           # simulated payment step
    sign/[token]                     # no-login counterparty signing flow
    api/documents                    # document CRUD
    api/payments                     # simulated payment endpoint
    api/sign                         # signing-link validation + signature capture
    api/upload                       # "upload your own agreement" flow
  lib/
    supabase/client.ts               # browser Supabase client
    supabase/server.ts               # server (RSC/route handler) Supabase client, RLS applies
    supabase/admin.ts                # service-role client, bypasses RLS (signing-link flow only)
    supabase/middleware.ts           # session refresh + route protection
    pdf/                             # PDF generation & signature-field placement helpers
    nda/                             # clause rendering, template constants
  components/
    ui/                              # generic UI primitives
    nda/                             # NDA-specific components (clause editor, signature pad, etc.)
  types/database.ts                  # hand-written types mirroring the SQL schema
supabase/
  migrations/0001_init.sql           # full schema, RLS policies, storage buckets
  seed/seed.sql                      # starter templates + default clause library
```

## Data model

See [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
for the full schema with comments. Highlights:

- `profiles` — 1:1 with Supabase `auth.users`, auto-created on signup via trigger.
- `templates` / `clause_library` — the 5 starter templates and their default
  clauses (core = guided-fields-only, optional = fully editable/removable).
- `documents` — one row per NDA (template-generated or uploaded PDF).
  `expires_at` is a generated column (`created_at + 30 days`) used for the
  auto-deletion reminder/cleanup job.
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
   `supabase/migrations/0001_init.sql`, then `supabase/seed/seed.sql`.
3. **Create storage buckets** are created for you by the migration
   (`uploaded-agreements`, `signed-documents`, both private).
4. **Copy env vars**: `cp .env.local.example .env.local` and fill in your
   Supabase project URL, anon key, and service role key from
   Project Settings → API.
5. **Install & run**:

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deploy to Vercel and set the same environment variables from
`.env.local.example` in the Vercel project settings. The 30-day
auto-deletion sweep is intended to run as a Vercel Cron job hitting an API
route (added when that feature is built) — Supabase's own `pg_cron` is an
alternative if you'd rather run it in the database.

## Status

Scaffolding + database schema are in place. Features are being built one at
a time, starting with accounts (signup/login).
