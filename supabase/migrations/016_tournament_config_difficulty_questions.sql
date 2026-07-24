-- ============================================
-- GameDay ADL - V16: Add difficulty and questions_per_game config to tournaments
-- When set, these override participant selection
-- NULL means participant can choose freely
-- Run this in Supabase SQL Editor
-- ============================================

ALTER TABLE public.trn_tournaments ADD COLUMN IF NOT EXISTS config_difficulty TEXT DEFAULT NULL;
ALTER TABLE public.trn_tournaments ADD COLUMN IF NOT EXISTS config_questions_per_game INTEGER DEFAULT NULL;
