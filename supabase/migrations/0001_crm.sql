-- Standerton Mills CRM schema + RLS
-- Run via Supabase CLI or paste into SQL editor.

-- Role enum-like check on profiles.role
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('manager', 'employee', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  type TEXT NOT NULL DEFAULT 'lead' CHECK (type IN ('lead', 'customer', 'supplier')),
  status TEXT NOT NULL DEFAULT 'active',
  owner_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  notes TEXT
);

CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contact_id UUID NOT NULL REFERENCES public.contacts (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'qualification' CHECK (stage IN ('qualification', 'proposal', 'won', 'lost')),
  value_zar NUMERIC(14, 2),
  owner_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  expected_close DATE
);

CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contact_id UUID REFERENCES public.contacts (id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals (id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('call', 'email', 'meeting', 'note')),
  subject TEXT NOT NULL,
  body TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE
);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'cancelled')),
  assignee_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts (id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals (id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE
);

CREATE INDEX contacts_owner_id_idx ON public.contacts (owner_id);
CREATE INDEX deals_contact_id_idx ON public.deals (contact_id);
CREATE INDEX deals_owner_id_idx ON public.deals (owner_id);
CREATE INDEX activities_contact_id_idx ON public.activities (contact_id);
CREATE INDEX activities_occurred_at_idx ON public.activities (occurred_at DESC);
CREATE INDEX tasks_assignee_id_idx ON public.tasks (assignee_id);
CREATE INDEX tasks_status_idx ON public.tasks (status);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- New auth user -> profile row (default staff)
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
    'staff'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Helper: CRM profile role for auth.uid() (avoids name clash with session CURRENT_ROLE)
CREATE OR REPLACE FUNCTION public.app_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- profiles
CREATE POLICY profiles_select_own_or_manager
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.app_user_role() = 'manager');

CREATE POLICY profiles_update_self
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_manager
  ON public.profiles FOR UPDATE
  USING (public.app_user_role() = 'manager')
  WITH CHECK (public.app_user_role() = 'manager');

-- contacts
CREATE POLICY contacts_select_auth
  ON public.contacts FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY contacts_insert_roles
  ON public.contacts FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND public.app_user_role() IN ('manager', 'employee', 'staff')
    AND (
      public.app_user_role() IN ('manager', 'employee')
      OR type = 'lead'
    )
  );

CREATE POLICY contacts_update_manager
  ON public.contacts FOR UPDATE
  USING (public.app_user_role() = 'manager');

CREATE POLICY contacts_update_employee
  ON public.contacts FOR UPDATE
  USING (public.app_user_role() = 'employee');

CREATE POLICY contacts_update_staff_own
  ON public.contacts FOR UPDATE
  USING (public.app_user_role() = 'staff' AND owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY contacts_delete_manager
  ON public.contacts FOR DELETE
  USING (public.app_user_role() = 'manager');

CREATE POLICY contacts_delete_employee_own
  ON public.contacts FOR DELETE
  USING (public.app_user_role() = 'employee' AND owner_id = auth.uid());

-- deals
CREATE POLICY deals_select_auth
  ON public.deals FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY deals_write_manager_employee
  ON public.deals FOR INSERT
  WITH CHECK (
    public.app_user_role() IN ('manager', 'employee')
    AND owner_id = auth.uid()
  );

CREATE POLICY deals_update_manager_employee
  ON public.deals FOR UPDATE
  USING (public.app_user_role() IN ('manager', 'employee'))
  WITH CHECK (true);

CREATE POLICY deals_delete_manager
  ON public.deals FOR DELETE
  USING (public.app_user_role() = 'manager');

CREATE POLICY deals_delete_employee_own
  ON public.deals FOR DELETE
  USING (public.app_user_role() = 'employee' AND owner_id = auth.uid());

-- activities
CREATE POLICY activities_select_auth
  ON public.activities FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY activities_insert_self
  ON public.activities FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.app_user_role() IS NOT NULL
  );

CREATE POLICY activities_update_manager_employee
  ON public.activities FOR UPDATE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY activities_update_staff_own
  ON public.activities FOR UPDATE
  USING (public.app_user_role() = 'staff' AND created_by = auth.uid());

CREATE POLICY activities_delete_manager
  ON public.activities FOR DELETE
  USING (public.app_user_role() = 'manager');

CREATE POLICY activities_delete_creator
  ON public.activities FOR DELETE
  USING (created_by = auth.uid());

-- tasks
CREATE POLICY tasks_select_auth
  ON public.tasks FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY tasks_insert_manager_employee
  ON public.tasks FOR INSERT
  WITH CHECK (
    public.app_user_role() IN ('manager', 'employee')
    AND created_by = auth.uid()
  );

CREATE POLICY tasks_insert_staff_self
  ON public.tasks FOR INSERT
  WITH CHECK (
    public.app_user_role() = 'staff'
    AND assignee_id = auth.uid()
    AND created_by = auth.uid()
  );

CREATE POLICY tasks_update_manager_employee
  ON public.tasks FOR UPDATE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY tasks_update_staff_assignee
  ON public.tasks FOR UPDATE
  USING (public.app_user_role() = 'staff' AND assignee_id = auth.uid());

CREATE POLICY tasks_delete_manager
  ON public.tasks FOR DELETE
  USING (public.app_user_role() = 'manager');

CREATE POLICY tasks_delete_employee_involved
  ON public.tasks FOR DELETE
  USING (
    public.app_user_role() = 'employee'
    AND (created_by = auth.uid() OR assignee_id = auth.uid())
  );
