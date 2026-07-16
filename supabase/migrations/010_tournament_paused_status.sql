-- ============================================
-- GameDay ADL - V10: Add 'paused' status to tournaments
-- Run this in Supabase SQL Editor
-- ============================================

-- Update the check constraint to include 'paused'
ALTER TABLE public.trn_tournaments DROP CONSTRAINT IF EXISTS trn_tournaments_status_check;
ALTER TABLE public.trn_tournaments ADD CONSTRAINT trn_tournaments_status_check
  CHECK (status IN ('pending', 'organizing', 'in_progress', 'paused', 'finished'));
