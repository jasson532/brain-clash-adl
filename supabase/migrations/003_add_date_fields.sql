-- ============================================
-- GameDay ADL - V3: Add date fields
-- Run this in Supabase SQL Editor
-- ============================================

-- Add event_date to gamedays
ALTER TABLE public.gamedays ADD COLUMN IF NOT EXISTS event_date DATE;

-- Add delete policies for editing support
CREATE POLICY "Allow public update on players" ON public.players
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete on teams" ON public.teams
  FOR DELETE USING (true);

CREATE POLICY "Allow public delete on participants" ON public.participants
  FOR DELETE USING (true);

CREATE POLICY "Allow public delete on gamedays" ON public.gamedays
  FOR DELETE USING (true);
