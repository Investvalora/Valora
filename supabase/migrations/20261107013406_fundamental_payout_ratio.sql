-- Percentage reported by the issuer-data provider, independent of portfolio income.
alter table public.fundamentals add column if not exists payout_ratio numeric;
alter table public.fundamentals add constraint fundamentals_payout_ratio_valid
  check (payout_ratio is null or (payout_ratio >= 0 and payout_ratio < 'Infinity'::numeric));
comment on column public.fundamentals.payout_ratio is
  'Issuer payout ratio in percent, provider-reported (Yahoo summaryDetail.payoutRatio × 100), with positive trailing EPS. Missing/unsupported stays NULL; never derived from investor receipts.';
