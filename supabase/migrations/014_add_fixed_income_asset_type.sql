-- Migration 014: adiciona fixed_income ao enum asset_type
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'fixed_income';
-- These catalog types existed in the hosted schema but were missing from replay.
-- Commit before subsequent migrations reference the new enum values.
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'etf_br';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'etf_us';
