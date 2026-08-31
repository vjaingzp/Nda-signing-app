-- =========================================================================
-- Migration 0005: let a signer pick a handwriting-style font for their
-- typed name, applied both in the live/PDF signature block and the
-- on-screen preview. `typed_signature` stays the literal text they typed;
-- this column just records which font renders it as. Existing rows (and
-- any future insert that somehow omits it) fall back to 'dancing_script'.
-- =========================================================================

alter table public.signatures
  add column if not exists signature_style text not null default 'dancing_script'
    check (signature_style in ('dancing_script', 'great_vibes', 'caveat', 'pacifico'));
