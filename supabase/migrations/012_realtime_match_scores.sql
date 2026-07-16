-- ============================================
-- GameDay ADL - V12: Enable realtime on trn_match_scores
-- Run this in Supabase SQL Editor
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.trn_match_scores;
