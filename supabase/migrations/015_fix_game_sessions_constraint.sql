-- ============================================
-- GameDay ADL - V15: Fix game sessions constraint
-- The UNIQUE constraint causes conflicts when multiple finished sessions exist
-- Run this in Supabase SQL Editor
-- ============================================

-- Remove the problematic constraint
ALTER TABLE public.trn_game_sessions DROP CONSTRAINT IF EXISTS trn_game_sessions_match_id_participant_id_is_active_key;
