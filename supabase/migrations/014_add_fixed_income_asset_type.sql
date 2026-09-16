-- Migration 014: adiciona fixed_income ao enum asset_type
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'fixed_income';
