-- =========================================================================
-- NDA Generator & E-Signing Tool — initial schema
-- Target: Supabase Postgres (free tier)
-- =========================================================================
-- Run this in the Supabase SQL editor, or via `supabase db push` once the
-- Supabase CLI is linked to a project. Safe to re-run: guarded with
-- IF NOT EXISTS / OR REPLACE where practical.
-- =========================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- -------------------------------------------------------------------------
-- ENUMS
-- -------------------------------------------------------------------------

do $$ begin
  create type nda_type as enum ('one_way', 'mutual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_source as enum ('template', 'upload');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_status as enum (
    'draft',              -- being filled out / edited
    'pending_payment',    -- finalized, awaiting simulated payment
    'awaiting_signatures',-- payment done, signing link(s) live
    'partially_signed',   -- some but not all signers have signed
    'completed',          -- all required signatures collected, PDF generated
    'expired'             -- past 30-day retention window, marked for deletion
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type party_role as enum ('disclosing', 'receiving', 'mutual', 'uploader', 'counterparty');
exception when duplicate_object then null; end $$;

do $$ begin
  create type party_type as enum ('individual', 'business');
exception when duplicate_object then null; end $$;

do $$ begin
  create type clause_category as enum ('core', 'optional');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'succeeded', 'failed');
exception when duplicate_object then null; end $$;

-- -------------------------------------------------------------------------
-- PROFILES  (1:1 with auth.users)
-- -------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -------------------------------------------------------------------------
-- TEMPLATES  (static reference / seed data — starter NDA templates)
-- -------------------------------------------------------------------------

create table if not exists public.templates (
  slug          text primary key,           -- e.g. 'freelancer_client'
  name          text not null,              -- e.g. 'Freelancer / Client'
  description   text,
  supports_type nda_type[] not null default array['one_way','mutual']::nda_type[],
  sort_order    int not null default 0,
  is_active     boolean not null default true
);

-- -------------------------------------------------------------------------
-- CLAUSE LIBRARY  (default clause text per template, versionable)
-- -------------------------------------------------------------------------

create table if not exists public.clause_library (
  id                uuid primary key default gen_random_uuid(),
  template_slug     text references public.templates(slug) on delete cascade, -- null = applies to all templates
  clause_key        text not null,          -- e.g. 'definition_of_confidential_info'
  title             text not null,
  category          clause_category not null,
  default_body      text not null,          -- clean readable default text, may include {{placeholders}}
  guided_fields     jsonb not null default '[]'::jsonb, -- schema for guided-edit fields on core clauses
  is_removable      boolean not null default false,     -- core clauses: always false
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);

-- A plain `unique (template_slug, clause_key)` wouldn't dedupe shared clauses:
-- Postgres unique constraints treat NULL <> NULL, so every row with
-- template_slug = null (i.e. "applies to all templates") would be its own
-- distinct entry. coalesce() normalizes null to '' so those rows conflict
-- with each other correctly, and seed.sql's ON CONFLICT target matches this
-- index expression exactly.
create unique index if not exists clause_library_template_clause_key_idx
  on public.clause_library (coalesce(template_slug, ''), clause_key);

-- -------------------------------------------------------------------------
-- DOCUMENTS  (one row per NDA, whether generated from a template or an
-- uploaded PDF)
-- -------------------------------------------------------------------------

-- expires_at is a plain column (not `generated always as`) because
-- timestamptz + interval is STABLE, not IMMUTABLE, in Postgres — generated
-- columns require an immutable expression. Its default mirrors created_at's
-- default of now(), so both resolve to the same instant on insert and the
-- app never overrides either column.
create table if not exists public.documents (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  title                 text not null default 'Untitled NDA',
  source                document_source not null default 'template',
  template_slug         text references public.templates(slug),
  nda_type              nda_type,                       -- null when source = 'upload'
  status                document_status not null default 'draft',
  governing_law         text not null default 'India',  -- fixed per requirements, kept as a column for clarity in generated text
  effective_date        date,
  term_months           int,                             -- confidentiality term length, guided field
  details               jsonb not null default '{}'::jsonb, -- free-form template answers (purpose, addresses, etc.)

  -- uploaded-agreement specifics
  upload_storage_path   text,                            -- Supabase Storage path of the original uploaded PDF
  upload_filename       text,
  upload_page_count     int,

  -- output
  final_pdf_storage_path text,                           -- generated/signed PDF, set once completed

  -- lifecycle / retention
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  finalized_at          timestamptz,                     -- when it left 'draft' for good
  expires_at            timestamptz not null default (now() + interval '30 days'),
  deletion_reminder_sent_at timestamptz,
  deleted_at             timestamptz
);

create index if not exists documents_user_id_idx on public.documents(user_id);
create index if not exists documents_status_idx on public.documents(status);
create index if not exists documents_expires_at_idx on public.documents(expires_at) where deleted_at is null;

-- -------------------------------------------------------------------------
-- DOCUMENT PARTIES  (the named individuals/businesses on the NDA)
-- -------------------------------------------------------------------------

create table if not exists public.document_parties (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references public.documents(id) on delete cascade,
  role          party_role not null,
  party_type    party_type not null default 'individual',
  full_name     text not null,
  company_name  text,
  address       text,
  email         text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists document_parties_document_id_idx on public.document_parties(document_id);

-- -------------------------------------------------------------------------
-- DOCUMENT CLAUSES  (per-document snapshot/copy of clauses, editable)
-- -------------------------------------------------------------------------

create table if not exists public.document_clauses (
  id                uuid primary key default gen_random_uuid(),
  document_id       uuid not null references public.documents(id) on delete cascade,
  clause_key        text not null,
  title             text not null,
  category          clause_category not null,
  body              text not null,               -- rendered/edited text shown in the document
  guided_field_values jsonb not null default '{}'::jsonb, -- values for core clause guided fields
  is_included       boolean not null default true,        -- optional clauses can be removed (soft)
  is_removable      boolean not null default false,        -- mirrors clause_library, enforced in app layer too
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (document_id, clause_key)
);

create index if not exists document_clauses_document_id_idx on public.document_clauses(document_id);

-- -------------------------------------------------------------------------
-- SIGNATURE PLACEMENTS  (marked signature/date locations — used for both
-- generated PDFs and user-uploaded PDFs)
-- -------------------------------------------------------------------------

create table if not exists public.signature_placements (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references public.documents(id) on delete cascade,
  party_role    party_role not null,      -- who must sign at this spot
  page_number   int not null default 1,
  x             numeric not null,         -- normalized 0..1 coordinates, page-relative
  y             numeric not null,
  width         numeric not null default 0.2,
  height        numeric not null default 0.06,
  field_type    text not null default 'signature', -- 'signature' | 'date' | 'name'
  created_at    timestamptz not null default now()
);

create index if not exists signature_placements_document_id_idx on public.signature_placements(document_id);

-- -------------------------------------------------------------------------
-- SIGNING LINKS  (shareable, tokenized links — counterparty needs no account)
-- -------------------------------------------------------------------------

create table if not exists public.signing_links (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references public.documents(id) on delete cascade,
  -- hex, not base64url: Postgres's encode() only supports 'base64' | 'hex' | 'escape',
  -- and plain base64 isn't URL-safe (+, /, = need escaping), so hex avoids both problems.
  token         text not null unique default encode(gen_random_bytes(24), 'hex'),
  party_role    party_role not null,
  expires_at    timestamptz not null default (now() + interval '30 days'),
  used_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists signing_links_document_id_idx on public.signing_links(document_id);

-- -------------------------------------------------------------------------
-- SIGNATURES  (the simulated e-signature event)
-- -------------------------------------------------------------------------

create table if not exists public.signatures (
  id                uuid primary key default gen_random_uuid(),
  document_id       uuid not null references public.documents(id) on delete cascade,
  signing_link_id   uuid references public.signing_links(id) on delete set null,
  party_role        party_role not null,
  signer_name       text not null,
  signer_email      text,
  consent_given     boolean not null default false,
  consent_text      text not null default 'I agree this constitutes my electronic signature and I consent to sign this document electronically.',
  typed_signature   text not null,          -- the typed name rendered as the signature
  ip_address        text,
  user_agent        text,
  signed_at         timestamptz not null default now()
);

create index if not exists signatures_document_id_idx on public.signatures(document_id);

-- -------------------------------------------------------------------------
-- PAYMENTS  (simulated — demo/test mode only, no real processor)
-- -------------------------------------------------------------------------

create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references public.documents(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  amount_cents    int not null default 49900,   -- purely cosmetic demo amount
  currency        text not null default 'INR',
  status          payment_status not null default 'pending',
  mock_reference  text not null default concat('DEMO-', substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists payments_document_id_idx on public.payments(document_id);

-- -------------------------------------------------------------------------
-- updated_at maintenance trigger (generic, reused across tables)
-- -------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.documents;
create trigger set_updated_at before update on public.documents
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.document_clauses;
create trigger set_updated_at before update on public.document_clauses
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
-- Owners (auth.uid()) can fully manage their own documents and everything
-- nested under them. Anonymous/public access to a specific document is
-- granted ONLY through the app's server-side API using the signing_links
-- token (via the service role key) — there is no public RLS policy that
-- exposes documents by token, keeping documents un-enumerable.

alter table public.profiles enable row level security;
alter table public.templates enable row level security;
alter table public.clause_library enable row level security;
alter table public.documents enable row level security;
alter table public.document_parties enable row level security;
alter table public.document_clauses enable row level security;
alter table public.signature_placements enable row level security;
alter table public.signing_links enable row level security;
alter table public.signatures enable row level security;
alter table public.payments enable row level security;

-- profiles: a user can read/update only their own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- templates & clause_library: readable by any authenticated user, read-only
drop policy if exists "templates_select_authenticated" on public.templates;
create policy "templates_select_authenticated" on public.templates
  for select using (auth.role() = 'authenticated');

drop policy if exists "clause_library_select_authenticated" on public.clause_library;
create policy "clause_library_select_authenticated" on public.clause_library
  for select using (auth.role() = 'authenticated');

-- documents: full CRUD for the owning user only
drop policy if exists "documents_owner_all" on public.documents;
create policy "documents_owner_all" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- document_parties / document_clauses / signature_placements / signing_links / signatures / payments:
-- scoped to the parent document's owner
drop policy if exists "document_parties_owner_all" on public.document_parties;
create policy "document_parties_owner_all" on public.document_parties
  for all using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_clauses_owner_all" on public.document_clauses;
create policy "document_clauses_owner_all" on public.document_clauses
  for all using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "signature_placements_owner_all" on public.signature_placements;
create policy "signature_placements_owner_all" on public.signature_placements
  for all using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "signing_links_owner_all" on public.signing_links;
create policy "signing_links_owner_all" on public.signing_links
  for all using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "signatures_owner_select" on public.signatures;
create policy "signatures_owner_select" on public.signatures
  for select using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "payments_owner_all" on public.payments;
create policy "payments_owner_all" on public.payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Note: the counterparty signing flow (no login) reads/writes documents,
-- document_clauses, signature_placements, signing_links and signatures via
-- Next.js server routes using the Supabase SERVICE ROLE key after validating
-- the token server-side — it deliberately bypasses RLS rather than relying
-- on a public policy, since no email/password identifies that user.

-- =========================================================================
-- STORAGE BUCKETS
-- =========================================================================
-- Private buckets; all access goes through signed URLs issued by server
-- routes (owner session, or a validated signing-link token).

insert into storage.buckets (id, name, public)
values
  ('uploaded-agreements', 'uploaded-agreements', false),
  ('signed-documents', 'signed-documents', false)
on conflict (id) do nothing;
