-- =========================================================================
-- Migration 0002: disambiguate which party a signing link / signature
-- belongs to.
-- =========================================================================
-- party_role alone can't do this for mutual NDAs: both document_parties
-- rows have role = 'mutual' (they're told apart only by sort_order —
-- "Party A" vs "Party B" in the UI), so a signing_links or signatures row
-- that only recorded party_role couldn't tell Party A's link/signature
-- apart from Party B's. party_id references the specific document_parties
-- row directly and becomes the authoritative identifier; party_role stays
-- as a denormalized, human-readable convenience.
--
-- Both tables are empty pre-feature (this migration ships with the first
-- code that writes to them), so party_id can go straight to NOT NULL
-- without a backfill step.
-- =========================================================================

alter table public.signing_links
  add column if not exists party_id uuid references public.document_parties(id) on delete cascade;
alter table public.signing_links
  alter column party_id set not null;

alter table public.signatures
  add column if not exists party_id uuid references public.document_parties(id) on delete cascade;
alter table public.signatures
  alter column party_id set not null;

-- A party can only sign a given document once. Guarded by an existence
-- check rather than exception-catching duplicate_object: pglite (used to
-- validate this migration locally) raises duplicate_table instead when the
-- constraint's backing index already exists, and checking pg_constraint
-- directly is portable across both.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'signatures_document_party_unique'
  ) then
    alter table public.signatures
      add constraint signatures_document_party_unique unique (document_id, party_id);
  end if;
end $$;

-- -------------------------------------------------------------------------
-- The document owner signs as themselves (party sort_order = 0) through
-- their normal authenticated session, not the token-based link flow the
-- counterparty uses. signatures previously only had a SELECT policy for
-- owners; this adds INSERT, scoped so an owner can only ever insert a
-- signature for their own party on their own document — never fabricate
-- the counterparty's signature by passing a different party_id. The
-- counterparty's own insert goes through the service-role client after
-- the app validates their token server-side, so it doesn't need a policy
-- here at all.
-- -------------------------------------------------------------------------
drop policy if exists "signatures_owner_insert_own_party" on public.signatures;
create policy "signatures_owner_insert_own_party" on public.signatures
  for insert with check (
    exists (
      select 1 from public.documents d
      join public.document_parties dp
        on dp.document_id = d.id and dp.sort_order = 0
      where d.id = document_id
        and d.user_id = auth.uid()
        and dp.id = party_id
    )
  );
