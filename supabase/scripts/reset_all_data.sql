-- ============================================
-- GameDay ADL - RESET: Limpiar todos los datos del juego
-- ⚠️ CUIDADO: Esto borra TODOS los datos de todas las tablas
-- Solo mantiene el admin por defecto (ADMIN/5325)
-- 
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Desactivar triggers temporalmente para evitar conflictos
SET session_replication_role = 'replica';

-- 2. Limpiar tablas TORNEO (orden por foreign keys)
TRUNCATE TABLE public.trn_live_scores CASCADE;
TRUNCATE TABLE public.trn_match_scores CASCADE;
TRUNCATE TABLE public.trn_matches CASCADE;
TRUNCATE TABLE public.trn_rounds CASCADE;
TRUNCATE TABLE public.trn_participants CASCADE;
TRUNCATE TABLE public.trn_teams CASCADE;
TRUNCATE TABLE public.trn_tournaments CASCADE;

-- 3. Limpiar tablas GAMEDAY (orden por foreign keys)
TRUNCATE TABLE public.live_scores CASCADE;
TRUNCATE TABLE public.scores CASCADE;
TRUNCATE TABLE public.games CASCADE;
TRUNCATE TABLE public.participants CASCADE;
TRUNCATE TABLE public.teams CASCADE;
TRUNCATE TABLE public.gamedays CASCADE;

-- 4. Tablas del modo solo (V1)
TRUNCATE TABLE public.game_sessions CASCADE;
TRUNCATE TABLE public.leaderboard CASCADE;
TRUNCATE TABLE public.players CASCADE;

-- 5. Limpiar admins y reinsertar el por defecto
TRUNCATE TABLE public.admins CASCADE;
INSERT INTO public.admins (name, password) VALUES ('ADMIN', '5325');

-- 6. Reactivar triggers
SET session_replication_role = 'origin';

-- ============================================
-- ✅ Listo! Base de datos limpia.
-- El admin ADMIN/5325 sigue disponible.
-- ============================================
