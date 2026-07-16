-- ============================================
-- GameDay ADL - V13: Allow multiple scores per participant per match
-- (each game played is a separate row)
-- Run this in Supabase SQL Editor
-- ============================================

-- Remove the unique constraint that prevents multiple games
ALTER TABLE public.trn_match_scores DROP CONSTRAINT IF EXISTS trn_match_scores_match_id_participant_id_key;
