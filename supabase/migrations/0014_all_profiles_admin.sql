-- Set every CRM profile to admin (existing users).
UPDATE public.profiles SET role = 'admin';

-- New signups: default profile role to admin (same policy).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'admin'
  );
  RETURN NEW;
END;
$$;
