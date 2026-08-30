-- =========================================================================
-- Migration 0003: add a 'voided' document status.
-- =========================================================================
-- Once any signature exists, the document locks (see assertDocumentEditable
-- in the app layer) — a signer's consent attaches to specific terms, and
-- editing after the fact would silently invalidate that consent. If the
-- owner genuinely needs to change something after signing has started, the
-- correct move is to void the document and start a new one, not edit the
-- signed-against copy in place. 'voided' is a terminal status: once set,
-- the document is locked for editing (same as 'completed') and its signing
-- links stop accepting new signatures.
--
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS is safe to re-run and (as of
-- Postgres 12+) fine to run outside its own explicit transaction block,
-- which is how the Supabase SQL editor runs a pasted script.
-- =========================================================================

alter type document_status add value if not exists 'voided';
