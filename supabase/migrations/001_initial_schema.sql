-- ============================================
-- GameDay ADL - Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Players table
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🦊',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Game Sessions table
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

-- 3. Leaderboard table (aggregated stats per player)
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
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_game_sessions_player_id ON public.game_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_completed_at ON public.game_sessions(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_best_score ON public.leaderboard(best_score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_total_score ON public.leaderboard(total_score DESC);

-- ============================================
-- Row Level Security (RLS)
-- Allow public read/write for the GameDay (no auth required)
-- ============================================
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Public access policies (anyone can read and write)
CREATE POLICY "Allow public read on players" ON public.players
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on players" ON public.players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on game_sessions" ON public.game_sessions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on game_sessions" ON public.game_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on leaderboard" ON public.leaderboard
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on leaderboard" ON public.leaderboard
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on leaderboard" ON public.leaderboard
  FOR UPDATE USING (true) WITH CHECK (true);
