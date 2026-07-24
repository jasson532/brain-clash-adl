-- ============================================
-- GameDay ADL - V14: Game sessions for recovery
-- Stores active game state so participants can resume after page reload
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS public.trn_game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.trn_tournaments(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.trn_matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.trn_teams(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.trn_participants(id) ON DELETE CASCADE,
  question_ids JSONB NOT NULL DEFAULT '[]', -- array of question IDs assigned
  current_index INTEGER NOT NULL DEFAULT 0, -- current question index
  score INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 10,
  config_time INTEGER NOT NULL DEFAULT 50,
  config_difficulty TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, participant_id, is_active)
);

CREATE INDEX IF NOT EXISTS idx_trn_game_sessions_participant ON public.trn_game_sessions(participant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_trn_game_sessions_match ON public.trn_game_sessions(match_id);

ALTER TABLE public.trn_game_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on trn_game_sessions" ON public.trn_game_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on trn_game_sessions" ON public.trn_game_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on trn_game_sessions" ON public.trn_game_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on trn_game_sessions" ON public.trn_game_sessions FOR DELETE USING (true);
