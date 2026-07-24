-- ============================================
-- BRAIN CLASH ADL - Full Database Schema
-- Compatible with any PostgreSQL instance
-- Generated: July 2026
-- ============================================

-- ============================================
-- 1. ADMINS
-- ============================================
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.admins (name, password) VALUES ('ADMIN', '5325');

-- ============================================
-- 2. SOLO MODE (V1) - Players, Sessions, Leaderboard
-- ============================================
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🦊',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  difficulty TEXT,
  best_streak INTEGER NOT NULL DEFAULT 0,
  time_per_question INTEGER NOT NULL DEFAULT 20,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL UNIQUE REFERENCES public.players(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_avatar TEXT NOT NULL DEFAULT '🦊',
  total_score INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3. GAMEDAY MODE - GameDays, Teams, Participants, Games, Scores
-- ============================================
CREATE TABLE IF NOT EXISTS public.gamedays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'finished')),
  max_teams INTEGER DEFAULT 10,
  max_games_per_participant INTEGER NOT NULL DEFAULT 3,
  event_date TEXT,
  questions_per_round INTEGER DEFAULT 10,
  time_per_question INTEGER DEFAULT 20,
  category INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', NULL)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gameday_id UUID NOT NULL REFERENCES public.gamedays(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#00f5ff',
  avatar TEXT NOT NULL DEFAULT '🦊',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(gameday_id, name)
);

CREATE TABLE IF NOT EXISTS public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🦊',
  is_captain BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gameday_id UUID NOT NULL REFERENCES public.gamedays(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  category INTEGER,
  difficulty TEXT,
  questions_per_round INTEGER NOT NULL DEFAULT 10,
  time_per_question INTEGER NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gameday_id UUID NOT NULL REFERENCES public.gamedays(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  time_per_question INTEGER NOT NULL DEFAULT 20,
  category TEXT,
  difficulty TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.live_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gameday_id UUID NOT NULL REFERENCES public.gamedays(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  participant_name TEXT,
  participant_avatar TEXT DEFAULT '🦊',
  current_score INTEGER NOT NULL DEFAULT 0,
  current_correct INTEGER NOT NULL DEFAULT 0,
  current_question INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  category_name TEXT,
  games_completed INTEGER NOT NULL DEFAULT 0,
  is_playing BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(gameday_id, participant_id)
);

-- Gameday team leaderboard view
CREATE OR REPLACE VIEW public.team_leaderboard AS
SELECT
  t.id AS team_id, t.name AS team_name, t.color AS team_color,
  t.avatar AS team_avatar, t.gameday_id, g.name AS gameday_name,
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

-- ============================================
-- 4. TOURNAMENT MODE
-- ============================================
CREATE TABLE IF NOT EXISTS public.trn_tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  size INTEGER NOT NULL CHECK (size IN (8, 16, 32)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'organizing', 'in_progress', 'paused', 'finished')),
  max_games_per_participant INTEGER NOT NULL DEFAULT 3,
  config_difficulty TEXT DEFAULT NULL,
  config_questions_per_game INTEGER DEFAULT NULL,
  config_time_per_question INTEGER DEFAULT NULL,
  current_round_id UUID,
  champion_team_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trn_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.trn_tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#00f5ff',
  avatar TEXT NOT NULL DEFAULT '🦊',
  seed INTEGER,
  bracket_side TEXT CHECK (bracket_side IN ('left', 'right')),
  is_eliminated BOOLEAN NOT NULL DEFAULT false,
  final_position INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, name)
);

CREATE TABLE IF NOT EXISTS public.trn_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.trn_teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🦊',
  is_captain BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trn_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.trn_tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  round_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'finished')),
  total_matches INTEGER NOT NULL DEFAULT 0,
  completed_matches INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trn_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.trn_tournaments(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES public.trn_rounds(id) ON DELETE CASCADE,
  match_number INTEGER NOT NULL,
  bracket_side TEXT CHECK (bracket_side IN ('left', 'right', 'final')),
  team_a_id UUID REFERENCES public.trn_teams(id) ON DELETE SET NULL,
  team_b_id UUID REFERENCES public.trn_teams(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES public.trn_teams(id) ON DELETE SET NULL,
  loser_id UUID REFERENCES public.trn_teams(id) ON DELETE SET NULL,
  team_a_score INTEGER NOT NULL DEFAULT 0,
  team_b_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'finished')),
  next_match_id UUID REFERENCES public.trn_matches(id) ON DELETE SET NULL,
  next_match_slot TEXT CHECK (next_match_slot IN ('team_a', 'team_b')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trn_match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.trn_matches(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.trn_tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.trn_teams(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.trn_participants(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  is_finished BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trn_live_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.trn_matches(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.trn_tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.trn_teams(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.trn_participants(id) ON DELETE CASCADE,
  participant_name TEXT,
  participant_avatar TEXT DEFAULT '🦊',
  current_score INTEGER NOT NULL DEFAULT 0,
  current_correct INTEGER NOT NULL DEFAULT 0,
  current_question INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  category_name TEXT,
  is_playing BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, participant_id)
);

CREATE TABLE IF NOT EXISTS public.trn_game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.trn_tournaments(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.trn_matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.trn_teams(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.trn_participants(id) ON DELETE CASCADE,
  question_ids JSONB NOT NULL DEFAULT '[]',
  current_index INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 10,
  config_time INTEGER NOT NULL DEFAULT 50,
  config_difficulty TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign keys added after table creation
ALTER TABLE public.trn_tournaments
  ADD CONSTRAINT fk_trn_tournaments_current_round
  FOREIGN KEY (current_round_id) REFERENCES public.trn_rounds(id) ON DELETE SET NULL;

ALTER TABLE public.trn_tournaments
  ADD CONSTRAINT fk_trn_tournaments_champion
  FOREIGN KEY (champion_team_id) REFERENCES public.trn_teams(id) ON DELETE SET NULL;

-- ============================================
-- 5. BRACKET VIEW
-- ============================================
CREATE OR REPLACE VIEW public.trn_bracket_view AS
SELECT
  m.id AS match_id, m.tournament_id, m.round_id,
  r.name AS round_name, r.display_name AS round_display_name, r.round_order,
  m.match_number, m.bracket_side, m.status AS match_status,
  m.team_a_id, ta.name AS team_a_name, ta.color AS team_a_color, ta.avatar AS team_a_avatar, m.team_a_score,
  m.team_b_id, tb.name AS team_b_name, tb.color AS team_b_color, tb.avatar AS team_b_avatar, m.team_b_score,
  m.winner_id, m.loser_id, m.next_match_id, m.next_match_slot, m.started_at, m.finished_at
FROM public.trn_matches m
JOIN public.trn_rounds r ON r.id = m.round_id
LEFT JOIN public.trn_teams ta ON ta.id = m.team_a_id
LEFT JOIN public.trn_teams tb ON tb.id = m.team_b_id
ORDER BY r.round_order, m.bracket_side, m.match_number;

-- ============================================
-- 6. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_game_sessions_player_id ON public.game_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_completed_at ON public.game_sessions(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_total_score ON public.leaderboard(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_teams_gameday_id ON public.teams(gameday_id);
CREATE INDEX IF NOT EXISTS idx_participants_team_id ON public.participants(team_id);
CREATE INDEX IF NOT EXISTS idx_scores_gameday_id ON public.scores(gameday_id);
CREATE INDEX IF NOT EXISTS idx_scores_team_id ON public.scores(team_id);
CREATE INDEX IF NOT EXISTS idx_scores_participant_id ON public.scores(participant_id);
CREATE INDEX IF NOT EXISTS idx_trn_teams_tournament ON public.trn_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_trn_participants_team ON public.trn_participants(team_id);
CREATE INDEX IF NOT EXISTS idx_trn_rounds_tournament ON public.trn_rounds(tournament_id);
CREATE INDEX IF NOT EXISTS idx_trn_matches_round ON public.trn_matches(round_id);
CREATE INDEX IF NOT EXISTS idx_trn_matches_tournament ON public.trn_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_trn_match_scores_match ON public.trn_match_scores(match_id);
CREATE INDEX IF NOT EXISTS idx_trn_match_scores_team ON public.trn_match_scores(team_id);
CREATE INDEX IF NOT EXISTS idx_trn_live_scores_match ON public.trn_live_scores(match_id);
CREATE INDEX IF NOT EXISTS idx_trn_game_sessions_participant ON public.trn_game_sessions(participant_id, is_active);

-- ============================================
-- 7. ROW LEVEL SECURITY (Public access - no auth)
-- ============================================
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamedays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trn_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trn_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trn_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trn_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trn_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trn_match_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trn_live_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trn_game_sessions ENABLE ROW LEVEL SECURITY;

-- Public access policies (all tables)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'admins','players','game_sessions','leaderboard',
    'gamedays','teams','participants','games','scores','live_scores',
    'trn_tournaments','trn_teams','trn_participants','trn_rounds',
    'trn_matches','trn_match_scores','trn_live_scores','trn_game_sessions'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "public_select_%s" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "public_select_%s" ON public.%I FOR SELECT USING (true)', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "public_insert_%s" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "public_insert_%s" ON public.%I FOR INSERT WITH CHECK (true)', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "public_update_%s" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "public_update_%s" ON public.%I FOR UPDATE USING (true) WITH CHECK (true)', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "public_delete_%s" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "public_delete_%s" ON public.%I FOR DELETE USING (true)', tbl, tbl);
  END LOOP;
END $$;

-- ============================================
-- 8. REALTIME (Supabase specific - remove if not using Supabase)
-- ============================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.trn_matches;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.trn_live_scores;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.trn_rounds;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.trn_match_scores;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.live_scores;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.scores;

-- ============================================
-- ✅ Full schema ready!
-- Uncomment section 8 if using Supabase Realtime.
-- ============================================
