-- ============================================
-- GameDay ADL - V9: Tournament Mode (Single Elimination Bracket)
-- Supports 8, 16, or 32 teams
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TOURNAMENTS - El torneo principal
-- ============================================
CREATE TABLE IF NOT EXISTS public.trn_tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  size INTEGER NOT NULL CHECK (size IN (8, 16, 32)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'organizing', 'in_progress', 'finished')),
  current_round_id UUID, -- se actualiza cuando avanza de ronda
  champion_team_id UUID, -- se llena al finalizar
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. TOURNAMENT TEAMS - Equipos inscritos en el torneo
-- ============================================
CREATE TABLE IF NOT EXISTS public.trn_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.trn_tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#00f5ff',
  avatar TEXT NOT NULL DEFAULT '🦊',
  seed INTEGER, -- posición en el bracket (se asigna al organizar)
  bracket_side TEXT CHECK (bracket_side IN ('left', 'right')), -- lado del bracket
  is_eliminated BOOLEAN NOT NULL DEFAULT false,
  final_position INTEGER, -- 1=campeón, 2=subcampeón, 3=tercer lugar, 4=cuarto lugar
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, name)
);

-- ============================================
-- 3. TOURNAMENT PARTICIPANTS - Jugadores de cada equipo
--    (tabla propia para independencia del modo gameday)
-- ============================================
CREATE TABLE IF NOT EXISTS public.trn_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.trn_teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🦊',
  is_captain BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 4. ROUNDS - Rondas del torneo
--    Para 32 equipos: round_of_32 → round_of_16 → quarterfinals → semifinals → third_place → final
--    Para 16 equipos: round_of_16 → quarterfinals → semifinals → third_place → final
--    Para 8 equipos: quarterfinals → semifinals → third_place → final
-- ============================================
CREATE TABLE IF NOT EXISTS public.trn_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.trn_tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'round_of_32', 'round_of_16', 'quarterfinals', 'semifinals', 'third_place', 'final'
  display_name TEXT NOT NULL, -- '32avos', '16avos', 'Octavos', 'Cuartos', 'Semifinal', 'Tercer Puesto', 'Final'
  round_order INTEGER NOT NULL, -- 1, 2, 3... para ordenar secuencialmente
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'finished')),
  total_matches INTEGER NOT NULL DEFAULT 0,
  completed_matches INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 5. MATCHES - Enfrentamientos individuales
-- ============================================
CREATE TABLE IF NOT EXISTS public.trn_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.trn_tournaments(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES public.trn_rounds(id) ON DELETE CASCADE,
  match_number INTEGER NOT NULL, -- posición dentro de la ronda (1, 2, 3...)
  bracket_side TEXT CHECK (bracket_side IN ('left', 'right', 'final')), -- lado del bracket
  -- Equipos enfrentados
  team_a_id UUID REFERENCES public.trn_teams(id) ON DELETE SET NULL,
  team_b_id UUID REFERENCES public.trn_teams(id) ON DELETE SET NULL,
  -- Resultado
  winner_id UUID REFERENCES public.trn_teams(id) ON DELETE SET NULL,
  loser_id UUID REFERENCES public.trn_teams(id) ON DELETE SET NULL,
  team_a_score INTEGER NOT NULL DEFAULT 0,
  team_b_score INTEGER NOT NULL DEFAULT 0,
  -- Estado
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'finished')),
  -- Match al que avanza el ganador (para armar el bracket)
  next_match_id UUID REFERENCES public.trn_matches(id) ON DELETE SET NULL,
  next_match_slot TEXT CHECK (next_match_slot IN ('team_a', 'team_b')), -- dónde se ubica en el siguiente match
  -- Timestamps
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 6. MATCH SCORES - Puntaje individual por participante en un match
--    (se resetea por ronda/match, el acumulado del equipo va en trn_matches)
-- ============================================
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, participant_id)
);

-- ============================================
-- 7. LIVE MATCH SCORES - Para actualización en tiempo real durante un match
-- ============================================
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

-- ============================================
-- FK de current_round y champion en tournaments
-- (se agregan después porque las tablas referenciadas se crearon después)
-- ============================================
ALTER TABLE public.trn_tournaments
  ADD CONSTRAINT fk_trn_tournaments_current_round
  FOREIGN KEY (current_round_id) REFERENCES public.trn_rounds(id) ON DELETE SET NULL;

ALTER TABLE public.trn_tournaments
  ADD CONSTRAINT fk_trn_tournaments_champion
  FOREIGN KEY (champion_team_id) REFERENCES public.trn_teams(id) ON DELETE SET NULL;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_trn_teams_tournament ON public.trn_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_trn_teams_bracket_side ON public.trn_teams(tournament_id, bracket_side);
CREATE INDEX IF NOT EXISTS idx_trn_participants_team ON public.trn_participants(team_id);
CREATE INDEX IF NOT EXISTS idx_trn_rounds_tournament ON public.trn_rounds(tournament_id);
CREATE INDEX IF NOT EXISTS idx_trn_rounds_order ON public.trn_rounds(tournament_id, round_order);
CREATE INDEX IF NOT EXISTS idx_trn_matches_round ON public.trn_matches(round_id);
CREATE INDEX IF NOT EXISTS idx_trn_matches_tournament ON public.trn_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_trn_matches_teams ON public.trn_matches(team_a_id, team_b_id);
CREATE INDEX IF NOT EXISTS idx_trn_match_scores_match ON public.trn_match_scores(match_id);
CREATE INDEX IF NOT EXISTS idx_trn_match_scores_team ON public.trn_match_scores(team_id);
CREATE INDEX IF NOT EXISTS idx_trn_match_scores_participant ON public.trn_match_scores(participant_id);
CREATE INDEX IF NOT EXISTS idx_trn_live_scores_match ON public.trn_live_scores(match_id);
CREATE INDEX IF NOT EXISTS idx_trn_live_scores_team ON public.trn_live_scores(team_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.trn_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trn_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trn_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trn_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trn_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trn_match_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trn_live_scores ENABLE ROW LEVEL SECURITY;

-- Tournaments
CREATE POLICY "Allow public read on trn_tournaments" ON public.trn_tournaments FOR SELECT USING (true);
CREATE POLICY "Allow public insert on trn_tournaments" ON public.trn_tournaments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on trn_tournaments" ON public.trn_tournaments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on trn_tournaments" ON public.trn_tournaments FOR DELETE USING (true);

-- Teams
CREATE POLICY "Allow public read on trn_teams" ON public.trn_teams FOR SELECT USING (true);
CREATE POLICY "Allow public insert on trn_teams" ON public.trn_teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on trn_teams" ON public.trn_teams FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on trn_teams" ON public.trn_teams FOR DELETE USING (true);

-- Participants
CREATE POLICY "Allow public read on trn_participants" ON public.trn_participants FOR SELECT USING (true);
CREATE POLICY "Allow public insert on trn_participants" ON public.trn_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on trn_participants" ON public.trn_participants FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on trn_participants" ON public.trn_participants FOR DELETE USING (true);

-- Rounds
CREATE POLICY "Allow public read on trn_rounds" ON public.trn_rounds FOR SELECT USING (true);
CREATE POLICY "Allow public insert on trn_rounds" ON public.trn_rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on trn_rounds" ON public.trn_rounds FOR UPDATE USING (true) WITH CHECK (true);

-- Matches
CREATE POLICY "Allow public read on trn_matches" ON public.trn_matches FOR SELECT USING (true);
CREATE POLICY "Allow public insert on trn_matches" ON public.trn_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on trn_matches" ON public.trn_matches FOR UPDATE USING (true) WITH CHECK (true);

-- Match Scores
CREATE POLICY "Allow public read on trn_match_scores" ON public.trn_match_scores FOR SELECT USING (true);
CREATE POLICY "Allow public insert on trn_match_scores" ON public.trn_match_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on trn_match_scores" ON public.trn_match_scores FOR UPDATE USING (true) WITH CHECK (true);

-- Live Scores
CREATE POLICY "Allow public read on trn_live_scores" ON public.trn_live_scores FOR SELECT USING (true);
CREATE POLICY "Allow public insert on trn_live_scores" ON public.trn_live_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on trn_live_scores" ON public.trn_live_scores FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on trn_live_scores" ON public.trn_live_scores FOR DELETE USING (true);

-- ============================================
-- REALTIME - Habilitar para actualizaciones en vivo
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.trn_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trn_live_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trn_rounds;

-- ============================================
-- VIEW: Bracket completo de un torneo
-- ============================================
CREATE OR REPLACE VIEW public.trn_bracket_view AS
SELECT
  m.id AS match_id,
  m.tournament_id,
  m.round_id,
  r.name AS round_name,
  r.display_name AS round_display_name,
  r.round_order,
  m.match_number,
  m.bracket_side,
  m.status AS match_status,
  -- Team A
  m.team_a_id,
  ta.name AS team_a_name,
  ta.color AS team_a_color,
  ta.avatar AS team_a_avatar,
  m.team_a_score,
  -- Team B
  m.team_b_id,
  tb.name AS team_b_name,
  tb.color AS team_b_color,
  tb.avatar AS team_b_avatar,
  m.team_b_score,
  -- Result
  m.winner_id,
  m.loser_id,
  m.next_match_id,
  m.next_match_slot,
  m.started_at,
  m.finished_at
FROM public.trn_matches m
JOIN public.trn_rounds r ON r.id = m.round_id
LEFT JOIN public.trn_teams ta ON ta.id = m.team_a_id
LEFT JOIN public.trn_teams tb ON tb.id = m.team_b_id
ORDER BY r.round_order, m.bracket_side, m.match_number;

-- ============================================
-- ✅ Tournament schema ready!
-- 
-- Flujo:
-- 1. Admin crea torneo (status: 'pending')
-- 2. Se registran equipos + participantes
-- 3. Admin presiona "Organizar" → se asignan seeds aleatorios,
--    se crean rounds + matches, status → 'organizing'
-- 4. Admin inicia torneo → status: 'in_progress', primera ronda activa
-- 5. Participantes juegan los matches de la ronda actual
-- 6. Cuando todos los matches de la ronda terminan:
--    - Auto-detección o admin finaliza ronda
--    - Ganadores avanzan al siguiente match
--    - Equipos eliminados se marcan
--    - Se muestra resumen de eliminados/clasificados
-- 7. Admin habilita siguiente ronda
-- 8. En semifinales: perdedores van al match de tercer puesto
-- 9. Final → se declara campeón, torneo status: 'finished'
-- ============================================
