-- ============================================
-- GameDay ADL - V5: Games table (team-level game config)
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create games table
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gameday_id UUID NOT NULL REFERENCES public.gamedays(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  category INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', NULL)),
  questions_per_round INTEGER NOT NULL DEFAULT 10,
  time_per_question INTEGER NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add game_id to scores
ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES public.games(id) ON DELETE CASCADE;

-- 3. Remove game config columns from gamedays (no longer needed there)
ALTER TABLE public.gamedays DROP COLUMN IF EXISTS questions_per_round;
ALTER TABLE public.gamedays DROP COLUMN IF EXISTS time_per_question;
ALTER TABLE public.gamedays DROP COLUMN IF EXISTS category;
ALTER TABLE public.gamedays DROP COLUMN IF EXISTS difficulty;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_games_gameday_id ON public.games(gameday_id);
CREATE INDEX IF NOT EXISTS idx_games_team_id ON public.games(team_id);
CREATE INDEX IF NOT EXISTS idx_scores_game_id ON public.scores(game_id);

-- 5. RLS for games
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on games" ON public.games FOR SELECT USING (true);
CREATE POLICY "Allow public insert on games" ON public.games FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on games" ON public.games FOR UPDATE USING (true) WITH CHECK (true);

-- 6. Update team_leaderboard view to still work without gameday config
DROP VIEW IF EXISTS public.team_leaderboard;
CREATE OR REPLACE VIEW public.team_leaderboard AS
SELECT
  t.id AS team_id,
  t.name AS team_name,
  t.color AS team_color,
  t.avatar AS team_avatar,
  t.gameday_id,
  g.name AS gameday_name,
  COALESCE(SUM(s.score), 0) AS total_score,
  COALESCE(SUM(s.correct_answers), 0) AS total_correct,
  COALESCE(SUM(s.total_questions), 0) AS total_questions,
  COALESCE(MAX(s.best_streak), 0) AS best_streak,
  COUNT(DISTINCT s.participant_id) AS active_players,
  COUNT(s.id) AS games_played
FROM public.teams t
JOIN public.gamedays g ON g.id = t.gameday_id
LEFT JOIN public.scores s ON s.team_id = t.id
GROUP BY t.id, t.name, t.color, t.avatar, t.gameday_id, g.name
ORDER BY total_score DESC;
