-- ============================================
-- GameDay ADL - V11: Add max_games_per_participant to tournaments
-- Run this in Supabase SQL Editor
-- ============================================

ALTER TABLE public.trn_tournaments ADD COLUMN IF NOT EXISTS max_games_per_participant INTEGER NOT NULL DEFAULT 3;
