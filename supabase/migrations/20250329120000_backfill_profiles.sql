-- Ensure every existing auth user has a profile (e.g. users created before the trigger existed).
INSERT INTO public.profiles (id, full_name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'full_name', u.email::text),
  'staff'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);
