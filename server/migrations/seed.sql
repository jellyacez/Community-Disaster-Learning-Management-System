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

-- Emergency hotline defaults; migration.sql inserts the same rows, so on a fresh database this
-- does nothing. Only 911 is real; the rest are samples (shown, never dialable) until set.
INSERT INTO public.emergency_contacts (agency, label, phone, is_sample, sort_order)
SELECT v.agency, v.label, v.phone, v.is_sample, v.sort_order
FROM (VALUES
  ('National Emergency', 'Emergency hotline', '911', false, 1),
  ('MDRRMO Bacolor', 'Globe', '0987 654 3210', true, 2),
  ('MDRRMO Bacolor', 'Smart', '0987 654 3210', true, 3),
  ('MDRRMO Bacolor', 'Landline', '045 900-0199', true, 4),
  ('BFP Bacolor', 'Fire station', '0987 654 3210', true, 5),
  ('PNP Bacolor', 'Police station', '0987 654 3210', true, 6)
) AS v(agency, label, phone, is_sample, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.emergency_contacts);

INSERT INTO public.system_settings (key, value) VALUES ('emergency_contacts_version', '1')
ON CONFLICT (key) DO NOTHING;
