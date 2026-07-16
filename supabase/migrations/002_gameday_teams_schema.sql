-- ============================================
-- GameDay ADL - V2: GameDays, Teams & Multiplayer
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. GameDays table (events)
CREATE TABLE IF NOT EXISTS public.gamedays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'finished')),
  max_teams INTEGER DEFAULT 10,
  questions_per_round INTEGER DEFAULT 10,
  time_per_question INTEGER DEFAULT 20,
  category INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', NULL)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gameday_id UUID NOT NULL REFERENCES public.gamedays(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#00f5ff',
  avatar TEXT NOT NULL DEFAULT '🦊',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(gameday_id, name)
);

-- 3. Participants (users in a team)
CREATE TABLE IF NOT EXISTS public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🦊',
  is_captain BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Scores (individual game results that contribute to team score)
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gameday_id UUID NOT NULL REFERENCES public.gamedays(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  time_per_question INTEGER NOT NULL DEFAULT 20,
  category TEXT,
  difficulty TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_teams_gameday_id ON public.teams(gameday_id);
CREATE INDEX IF NOT EXISTS idx_participants_team_id ON public.participants(team_id);
CREATE INDEX IF NOT EXISTS idx_scores_gameday_id ON public.scores(gameday_id);
CREATE INDEX IF NOT EXISTS idx_scores_team_id ON public.scores(team_id);
CREATE INDEX IF NOT EXISTS idx_scores_participant_id ON public.scores(participant_id);
CREATE INDEX IF NOT EXISTS idx_scores_completed_at ON public.scores(completed_at DESC);

-- ============================================
-- Row Level Security — Public access for GameDay
-- ============================================
ALTER TABLE public.gamedays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- GameDays: public read, public insert/update
CREATE POLICY "Allow public read on gamedays" ON public.gamedays FOR SELECT USING (true);
CREATE POLICY "Allow public insert on gamedays" ON public.gamedays FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on gamedays" ON public.gamedays FOR UPDATE USING (true) WITH CHECK (true);

-- Teams: public read/write
CREATE POLICY "Allow public read on teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Allow public insert on teams" ON public.teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on teams" ON public.teams FOR UPDATE USING (true) WITH CHECK (true);

-- Participants: public read/write
CREATE POLICY "Allow public read on participants" ON public.participants FOR SELECT USING (true);
CREATE POLICY "Allow public insert on participants" ON public.participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on participants" ON public.participants FOR UPDATE USING (true) WITH CHECK (true);

-- Scores: public read/write
CREATE POLICY "Allow public read on scores" ON public.scores FOR SELECT USING (true);
CREATE POLICY "Allow public insert on scores" ON public.scores FOR INSERT WITH CHECK (true);

-- ============================================
-- View: Team leaderboard (aggregated scores per team per gameday)
-- ============================================
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
