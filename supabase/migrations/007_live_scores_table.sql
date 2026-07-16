-- ============================================
-- GameDay ADL - V7: Live scores for real-time dashboard
-- Run this in Supabase SQL Editor
-- ============================================

-- Table to track live progress (updated on every answer)
CREATE TABLE IF NOT EXISTS public.live_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gameday_id UUID NOT NULL REFERENCES public.gamedays(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  current_score INTEGER NOT NULL DEFAULT 0,
  current_correct INTEGER NOT NULL DEFAULT 0,
  current_question INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  is_playing BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(gameday_id, participant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_live_scores_gameday ON public.live_scores(gameday_id);
CREATE INDEX IF NOT EXISTS idx_live_scores_team ON public.live_scores(team_id);

-- RLS
ALTER TABLE public.live_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on live_scores" ON public.live_scores FOR SELECT USING (true);
CREATE POLICY "Allow public insert on live_scores" ON public.live_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on live_scores" ON public.live_scores FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on live_scores" ON public.live_scores FOR DELETE USING (true);

-- Enable realtime for live_scores
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_scores;
