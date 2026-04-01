-- Workforce attendance: departments, employees, RFID readers, events, segments, lost time

CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT departments_code_unique UNIQUE (code)
);

CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.workforce_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  full_name TEXT NOT NULL,
  employee_number TEXT,
  rfid_uid TEXT NOT NULL,
  profile_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  primary_department_id UUID REFERENCES public.departments (id) ON DELETE SET NULL,
  phone TEXT,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT workforce_employees_rfid_uid_unique UNIQUE (rfid_uid)
);

CREATE INDEX workforce_employees_profile_id_idx ON public.workforce_employees (profile_id);
CREATE INDEX workforce_employees_active_idx ON public.workforce_employees (active);

CREATE TRIGGER workforce_employees_updated_at
  BEFORE UPDATE ON public.workforce_employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.access_readers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  reader_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('facility_in', 'facility_out', 'department')),
  department_id UUID REFERENCES public.departments (id) ON DELETE SET NULL,
  CONSTRAINT access_readers_reader_key_unique UNIQUE (reader_key),
  CONSTRAINT access_readers_department_kind CHECK (
    (kind = 'department' AND department_id IS NOT NULL)
    OR (kind IN ('facility_in', 'facility_out') AND department_id IS NULL)
  )
);

CREATE TABLE public.access_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  workforce_employee_id UUID NOT NULL REFERENCES public.workforce_employees (id) ON DELETE CASCADE,
  reader_id UUID NOT NULL REFERENCES public.access_readers (id) ON DELETE RESTRICT,
  rfid_raw TEXT,
  device_meta JSONB
);

CREATE INDEX access_events_emp_time_idx ON public.access_events (workforce_employee_id, occurred_at DESC, id DESC);
CREATE INDEX access_events_occurred_at_idx ON public.access_events (occurred_at DESC);

CREATE TABLE public.department_time_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workforce_employee_id UUID NOT NULL REFERENCES public.workforce_employees (id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments (id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  started_event_id UUID REFERENCES public.access_events (id) ON DELETE SET NULL,
  ended_event_id UUID REFERENCES public.access_events (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX department_time_segments_one_open_per_employee
  ON public.department_time_segments (workforce_employee_id)
  WHERE ended_at IS NULL;

CREATE INDEX department_time_segments_emp_started_idx
  ON public.department_time_segments (workforce_employee_id, started_at DESC);

CREATE TABLE public.lost_time_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  workforce_employee_id UUID NOT NULL REFERENCES public.workforce_employees (id) ON DELETE CASCADE,
  left_at TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ NOT NULL,
  minutes_lost INTEGER NOT NULL CHECK (minutes_lost >= 15),
  facility_out_event_id UUID REFERENCES public.access_events (id) ON DELETE SET NULL,
  facility_in_event_id UUID REFERENCES public.access_events (id) ON DELETE SET NULL
);

CREATE INDEX lost_time_emp_idx ON public.lost_time_incidents (workforce_employee_id, returned_at DESC);

-- RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_readers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_time_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_time_incidents ENABLE ROW LEVEL SECURITY;

-- Managers: full CRUD on workforce domain
CREATE POLICY departments_manager_all
  ON public.departments FOR ALL
  USING (public.app_user_role() = 'manager')
  WITH CHECK (public.app_user_role() = 'manager');

CREATE POLICY workforce_employees_manager_all
  ON public.workforce_employees FOR ALL
  USING (public.app_user_role() = 'manager')
  WITH CHECK (public.app_user_role() = 'manager');

CREATE POLICY access_readers_manager_all
  ON public.access_readers FOR ALL
  USING (public.app_user_role() = 'manager')
  WITH CHECK (public.app_user_role() = 'manager');

CREATE POLICY access_events_manager_all
  ON public.access_events FOR ALL
  USING (public.app_user_role() = 'manager')
  WITH CHECK (public.app_user_role() = 'manager');

CREATE POLICY department_segments_manager_all
  ON public.department_time_segments FOR ALL
  USING (public.app_user_role() = 'manager')
  WITH CHECK (public.app_user_role() = 'manager');

CREATE POLICY lost_time_manager_all
  ON public.lost_time_incidents FOR ALL
  USING (public.app_user_role() = 'manager')
  WITH CHECK (public.app_user_role() = 'manager');

-- CRM employees: read own linked workforce row and related data
CREATE POLICY workforce_employees_employee_self
  ON public.workforce_employees FOR SELECT
  USING (
    public.app_user_role() = 'employee'
    AND profile_id = auth.uid()
  );

CREATE POLICY access_events_employee_self
  ON public.access_events FOR SELECT
  USING (
    public.app_user_role() = 'employee'
    AND EXISTS (
      SELECT 1 FROM public.workforce_employees we
      WHERE we.id = access_events.workforce_employee_id
        AND we.profile_id = auth.uid()
    )
  );

CREATE POLICY department_segments_employee_self
  ON public.department_time_segments FOR SELECT
  USING (
    public.app_user_role() = 'employee'
    AND EXISTS (
      SELECT 1 FROM public.workforce_employees we
      WHERE we.id = department_time_segments.workforce_employee_id
        AND we.profile_id = auth.uid()
    )
  );

CREATE POLICY lost_time_employee_self
  ON public.lost_time_incidents FOR SELECT
  USING (
    public.app_user_role() = 'employee'
    AND EXISTS (
      SELECT 1 FROM public.workforce_employees we
      WHERE we.id = lost_time_incidents.workforce_employee_id
        AND we.profile_id = auth.uid()
    )
  );

CREATE POLICY departments_employee_select
  ON public.departments FOR SELECT
  USING (public.app_user_role() = 'employee');

CREATE POLICY access_readers_employee_select
  ON public.access_readers FOR SELECT
  USING (public.app_user_role() = 'employee');

-- Ingest RPC: insert event + apply segment / lost-time rules (service_role only)
CREATE OR REPLACE FUNCTION public.workforce_apply_access_event(
  p_reader_key TEXT,
  p_rfid_uid TEXT,
  p_occurred_at TIMESTAMPTZ DEFAULT NULL,
  p_device_meta JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reader RECORD;
  v_emp_id UUID;
  v_ts TIMESTAMPTZ;
  v_event_id UUID;
  v_last_kind TEXT;
  v_on_site BOOLEAN;
  v_out_id UUID;
  v_out_ts TIMESTAMPTZ;
  v_minutes INTEGER;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    IF public.app_user_role() IS DISTINCT FROM 'manager' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
    END IF;
  END IF;

  v_ts := COALESCE(p_occurred_at, now());
  p_rfid_uid := lower(trim(p_rfid_uid));
  p_reader_key := trim(p_reader_key);

  IF p_rfid_uid = '' OR p_reader_key = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reader_key and rfid_uid required');
  END IF;

  SELECT * INTO v_reader FROM public.access_readers WHERE reader_key = p_reader_key LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown_reader_key');
  END IF;

  SELECT id INTO v_emp_id FROM public.workforce_employees
  WHERE lower(trim(rfid_uid)) = p_rfid_uid AND active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown_or_inactive_rfid');
  END IF;

  INSERT INTO public.access_events (occurred_at, workforce_employee_id, reader_id, rfid_raw, device_meta)
  VALUES (v_ts, v_emp_id, v_reader.id, p_rfid_uid, p_device_meta)
  RETURNING id INTO v_event_id;

  SELECT ar.kind INTO v_last_kind
  FROM public.access_events ae
  JOIN public.access_readers ar ON ar.id = ae.reader_id
  WHERE ae.workforce_employee_id = v_emp_id
    AND ar.kind IN ('facility_in', 'facility_out')
    AND (ae.occurred_at < v_ts OR (ae.occurred_at = v_ts AND ae.id < v_event_id))
  ORDER BY ae.occurred_at DESC, ae.id DESC
  LIMIT 1;

  v_on_site := (v_last_kind = 'facility_in');

  IF v_reader.kind = 'facility_out' THEN
    UPDATE public.department_time_segments
    SET ended_at = v_ts, ended_event_id = v_event_id
    WHERE workforce_employee_id = v_emp_id AND ended_at IS NULL;

  ELSIF v_reader.kind = 'facility_in' THEN
    IF v_last_kind IS DISTINCT FROM 'facility_in' THEN
      SELECT ae.id, ae.occurred_at INTO v_out_id, v_out_ts
      FROM public.access_events ae
      JOIN public.access_readers ar ON ar.id = ae.reader_id
      WHERE ae.workforce_employee_id = v_emp_id
        AND ar.kind = 'facility_out'
        AND (ae.occurred_at < v_ts OR (ae.occurred_at = v_ts AND ae.id < v_event_id))
      ORDER BY ae.occurred_at DESC, ae.id DESC
      LIMIT 1;

      IF FOUND AND v_ts >= v_out_ts + interval '15 minutes' THEN
        v_minutes := floor(extract(epoch FROM (v_ts - v_out_ts)) / 60)::integer;
        IF v_minutes >= 15 THEN
          INSERT INTO public.lost_time_incidents (
            workforce_employee_id, left_at, returned_at, minutes_lost,
            facility_out_event_id, facility_in_event_id
          ) VALUES (
            v_emp_id, v_out_ts, v_ts, v_minutes, v_out_id, v_event_id
          );
        END IF;
      END IF;
    END IF;

  ELSIF v_reader.kind = 'department' THEN
    IF v_on_site THEN
      UPDATE public.department_time_segments
      SET ended_at = v_ts, ended_event_id = v_event_id
      WHERE workforce_employee_id = v_emp_id AND ended_at IS NULL;

      INSERT INTO public.department_time_segments (
        workforce_employee_id, department_id, started_at, started_event_id
      ) VALUES (
        v_emp_id, v_reader.department_id, v_ts, v_event_id
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'event_id', v_event_id,
    'reader_kind', v_reader.kind
  );
END;
$$;

REVOKE ALL ON FUNCTION public.workforce_apply_access_event(TEXT, TEXT, TIMESTAMPTZ, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.workforce_apply_access_event(TEXT, TEXT, TIMESTAMPTZ, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.workforce_apply_access_event(TEXT, TEXT, TIMESTAMPTZ, JSONB) TO authenticated;
