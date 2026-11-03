SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user'
  AND column_name IN (
    'name',
    'first_name',
    'middle_name',
    'last_name'
  )
ORDER BY column_name;
ALTER TABLE public.module_data
  ADD COLUMN IF NOT EXISTS enrollment_code VARCHAR(12);
UPDATE public.module_data
SET enrollment_code = upper(substr(md5(random()::text || mod_id::text), 1, 6))
WHERE enrollment_code IS NULL;
