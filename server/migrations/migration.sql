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
