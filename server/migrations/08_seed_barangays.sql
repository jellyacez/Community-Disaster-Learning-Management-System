-- ============================================================
-- Migration: 08_seed_barangays.sql
-- Description: Seed the 21 official barangays of Bacolor, Pampanga
-- Safe to re-run: Uses ON CONFLICT (name) DO NOTHING
-- ============================================================

INSERT INTO public.barangays (name) VALUES
  ('Balas'),
  ('Cabalantian'),
  ('Cabambangan'),
  ('Cabetican'),
  ('Calibutbut'),
  ('Concepcion'),
  ('Dolores'),
  ('Duat'),
  ('Macabacle'),
  ('Magliman'),
  ('Maliwalu'),
  ('Mesalipit'),
  ('Parulog'),
  ('Potrero'),
  ('San Antonio'),
  ('San Isidro'),
  ('San Vicente'),
  ('Santa Barbara'),
  ('Santa Ines'),
  ('Talba'),
  ('Tinajero')
ON CONFLICT (name) DO NOTHING;
