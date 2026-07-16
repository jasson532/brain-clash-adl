-- ============================================
-- GameDay ADL - V4: Admin table
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on admins" ON public.admins
  FOR SELECT USING (true);

-- Insert default admin
INSERT INTO public.admins (name, password) VALUES ('ADMIN', '5325');
