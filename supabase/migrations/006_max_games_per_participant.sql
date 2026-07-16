-- ============================================
-- GameDay ADL - V6: Max games per participant
-- Run this in Supabase SQL Editor
-- ============================================

-- Add max_games_per_participant to gamedays
ALTER TABLE public.gamedays ADD COLUMN IF NOT EXISTS max_games_per_participant INTEGER NOT NULL DEFAULT 3;
