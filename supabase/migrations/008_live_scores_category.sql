-- ============================================
-- GameDay ADL - V8: Add category and participant info to live_scores
-- Run this in Supabase SQL Editor
-- ============================================

ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS participant_name TEXT;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS participant_avatar TEXT DEFAULT '🦊';
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS games_completed INTEGER NOT NULL DEFAULT 0;
