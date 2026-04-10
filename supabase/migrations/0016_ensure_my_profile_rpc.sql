-- Allow users missing a profiles row (e.g. trigger failure, legacy auth user) to bootstrap CRM access.
-- SECURITY DEFINER bypasses RLS; only inserts when no row exists for auth.uid().

CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  SELECT
    u.id,
    COALESCE(
      NULLIF(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(trim(split_part(u.email, '@', 1)), ''),
      'User'
    ),
    'sales'
  FROM auth.users AS u
  WHERE u.id = auth.uid()
  ON CONFLICT (id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;
