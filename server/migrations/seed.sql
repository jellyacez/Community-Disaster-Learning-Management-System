-- Reference data a fresh database needs. Run by `npm run db:setup` after schema.sql and
-- migration.sql. Safe to re-run: existing rows are left as they are.

-- The 21 barangays of Bacolor, Pampanga, in the same order (and so the same ids on an
-- empty table) as production.
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

-- System settings the admin console reads. support_email stays empty so the app falls
-- back to EMAIL_USER; set the real address in System Settings after setup.
INSERT INTO public.system_settings (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('system_name', 'Community Disaster Learning Management System'),
  ('broadcast_active', 'false'),
  ('broadcast_message', ''),
  ('broadcast_severity', 'info'),
  ('support_email', ''),
  ('org_footer_text', 'Community DRRM System - Bacolor, Pampanga.')
ON CONFLICT (key) DO NOTHING;
