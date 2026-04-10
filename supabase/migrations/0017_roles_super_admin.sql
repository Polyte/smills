-- super_admin tier + privilege-normalized app_user_role() for RLS.
-- Client/UI should read profiles.role for display; app_user_role() maps super_admin→admin
-- and production_manager→admin so existing policies keep working.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (
    role IN ('super_admin', 'admin', 'production_manager', 'sales', 'quality_officer')
  );

-- Stored role (for rules that must distinguish super_admin, e.g. who may assign it)
CREATE OR REPLACE FUNCTION public.app_user_role_raw()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Normalized role for RLS: super_admin and production_manager both behave as admin in checks
CREATE OR REPLACE FUNCTION public.app_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE r.role
    WHEN 'super_admin' THEN 'admin'
    WHEN 'production_manager' THEN 'admin'
    ELSE r.role
  END
  FROM public.profiles r
  WHERE r.id = auth.uid();
$$;

COMMENT ON FUNCTION public.app_user_role() IS
  'RLS helper: maps super_admin and production_manager to admin. Use profiles.role in the app for the real value.';

GRANT EXECUTE ON FUNCTION public.app_user_role_raw() TO authenticated;

-- Only super_admin may create or edit rows whose role is super_admin
DROP POLICY IF EXISTS profiles_select_own_or_ops ON public.profiles;
CREATE POLICY profiles_select_own_or_ops
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.app_user_role_raw() IN ('admin', 'production_manager', 'super_admin')
  );

DROP POLICY IF EXISTS profiles_update_ops ON public.profiles;
CREATE POLICY profiles_update_ops
  ON public.profiles FOR UPDATE
  USING (
    public.app_user_role_raw() IN ('admin', 'production_manager', 'super_admin')
    AND (
      profiles.role IS DISTINCT FROM 'super_admin'
      OR public.app_user_role_raw() = 'super_admin'
    )
  )
  WITH CHECK (
    public.app_user_role_raw() IN ('admin', 'production_manager', 'super_admin')
    AND (
      role IS DISTINCT FROM 'super_admin'
      OR public.app_user_role_raw() = 'super_admin'
    )
  );
