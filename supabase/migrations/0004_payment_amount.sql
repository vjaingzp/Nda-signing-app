-- =========================================================================
-- Migration 0004: lower the default test payment amount from a leftover
-- ₹499 placeholder (set before the payment feature was actually built) to
-- ₹49, matching the ₹49–₹79 range this was actually planned around. The
-- app always passes amount_cents explicitly on insert; this default is a
-- backstop for correctness, not the source of truth.
-- =========================================================================

alter table public.payments
  alter column amount_cents set default 4900;
