-- Factory operations: roles migration, sales orders, samples, work orders, QC, automation, lots, logistics fields.
-- Depends on 0001–0009.

-- ---------------------------------------------------------------------------
-- 1) Migrate CRM roles to: admin | production_manager | sales | quality_officer
-- ---------------------------------------------------------------------------
UPDATE public.profiles SET role = 'production_manager' WHERE role = 'manager';
UPDATE public.profiles SET role = 'sales' WHERE role = 'staff';
UPDATE public.profiles SET role = 'quality_officer' WHERE role = 'employee';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (
    role IN ('admin', 'production_manager', 'sales', 'quality_officer')
  );

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
    'sales'
  );
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Replace RLS policies (remove legacy manager / employee / staff checks)
-- ---------------------------------------------------------------------------

-- profiles
DROP POLICY IF EXISTS profiles_select_own_or_manager ON public.profiles;
DROP POLICY IF EXISTS profiles_update_manager ON public.profiles;

CREATE POLICY profiles_select_own_or_ops
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.app_user_role() IN ('admin', 'production_manager')
  );

CREATE POLICY profiles_update_ops
  ON public.profiles FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager'))
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager'));

-- contacts
DROP POLICY IF EXISTS contacts_insert_roles ON public.contacts;
DROP POLICY IF EXISTS contacts_update_manager ON public.contacts;
DROP POLICY IF EXISTS contacts_update_employee ON public.contacts;
DROP POLICY IF EXISTS contacts_update_staff_own ON public.contacts;
DROP POLICY IF EXISTS contacts_delete_manager ON public.contacts;
DROP POLICY IF EXISTS contacts_delete_employee_own ON public.contacts;

CREATE POLICY contacts_insert_roles
  ON public.contacts FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer')
    AND (
      public.app_user_role() IN ('admin', 'production_manager', 'quality_officer')
      OR type = 'lead'
    )
  );

CREATE POLICY contacts_update_ops
  ON public.contacts FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'quality_officer'));

CREATE POLICY contacts_update_sales_own
  ON public.contacts FOR UPDATE
  USING (public.app_user_role() = 'sales' AND owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY contacts_delete_ops
  ON public.contacts FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY contacts_delete_sales_own
  ON public.contacts FOR DELETE
  USING (public.app_user_role() = 'sales' AND owner_id = auth.uid());

-- deals
DROP POLICY IF EXISTS deals_write_manager_employee ON public.deals;
DROP POLICY IF EXISTS deals_update_manager_employee ON public.deals;
DROP POLICY IF EXISTS deals_delete_manager ON public.deals;
DROP POLICY IF EXISTS deals_delete_employee_own ON public.deals;

CREATE POLICY deals_write_ops_sales
  ON public.deals FOR INSERT
  WITH CHECK (
    public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer')
    AND owner_id = auth.uid()
  );

CREATE POLICY deals_update_ops_sales
  ON public.deals FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer'))
  WITH CHECK (true);

CREATE POLICY deals_delete_ops
  ON public.deals FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY deals_delete_sales_own
  ON public.deals FOR DELETE
  USING (public.app_user_role() = 'sales' AND owner_id = auth.uid());

-- activities
DROP POLICY IF EXISTS activities_update_manager_employee ON public.activities;
DROP POLICY IF EXISTS activities_update_staff_own ON public.activities;
DROP POLICY IF EXISTS activities_delete_manager ON public.activities;

CREATE POLICY activities_update_ops_sales
  ON public.activities FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer'));

CREATE POLICY activities_update_sales_own
  ON public.activities FOR UPDATE
  USING (public.app_user_role() = 'sales' AND created_by = auth.uid());

CREATE POLICY activities_delete_ops
  ON public.activities FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

-- tasks
DROP POLICY IF EXISTS tasks_insert_manager_employee ON public.tasks;
DROP POLICY IF EXISTS tasks_insert_staff_self ON public.tasks;
DROP POLICY IF EXISTS tasks_update_manager_employee ON public.tasks;
DROP POLICY IF EXISTS tasks_update_staff_assignee ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_manager ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_employee_involved ON public.tasks;

CREATE POLICY tasks_insert_ops_sales
  ON public.tasks FOR INSERT
  WITH CHECK (
    public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer')
    AND created_by = auth.uid()
  );

CREATE POLICY tasks_insert_sales_self
  ON public.tasks FOR INSERT
  WITH CHECK (
    public.app_user_role() = 'sales'
    AND assignee_id = auth.uid()
    AND created_by = auth.uid()
  );

CREATE POLICY tasks_update_ops
  ON public.tasks FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer'));

CREATE POLICY tasks_update_sales_assignee
  ON public.tasks FOR UPDATE
  USING (public.app_user_role() = 'sales' AND assignee_id = auth.uid());

CREATE POLICY tasks_delete_ops
  ON public.tasks FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY tasks_delete_sales_involved
  ON public.tasks FOR DELETE
  USING (
    public.app_user_role() = 'sales'
    AND (created_by = auth.uid() OR assignee_id = auth.uid())
  );

-- inventory
DROP POLICY IF EXISTS inv_items_write_mgr_emp ON public.inv_items;
DROP POLICY IF EXISTS inv_items_update_mgr_emp ON public.inv_items;
DROP POLICY IF EXISTS inv_items_delete_mgr ON public.inv_items;
DROP POLICY IF EXISTS inv_locations_write_mgr_emp ON public.inv_locations;
DROP POLICY IF EXISTS inv_locations_update_mgr_emp ON public.inv_locations;
DROP POLICY IF EXISTS inv_locations_delete_mgr ON public.inv_locations;
DROP POLICY IF EXISTS inv_po_insert ON public.inv_production_orders;
DROP POLICY IF EXISTS inv_po_update ON public.inv_production_orders;
DROP POLICY IF EXISTS inv_po_delete_mgr ON public.inv_production_orders;
DROP POLICY IF EXISTS inv_lines_in_insert ON public.inv_production_lines_in;
DROP POLICY IF EXISTS inv_lines_in_update ON public.inv_production_lines_in;
DROP POLICY IF EXISTS inv_lines_in_delete ON public.inv_production_lines_in;
DROP POLICY IF EXISTS inv_lines_out_insert ON public.inv_production_lines_out;
DROP POLICY IF EXISTS inv_lines_out_update ON public.inv_production_lines_out;
DROP POLICY IF EXISTS inv_lines_out_delete ON public.inv_production_lines_out;
DROP POLICY IF EXISTS inv_shipments_insert ON public.inv_shipments;
DROP POLICY IF EXISTS inv_shipments_update ON public.inv_shipments;
DROP POLICY IF EXISTS inv_shipments_delete_mgr ON public.inv_shipments;
DROP POLICY IF EXISTS inv_shipment_lines_insert ON public.inv_shipment_lines;
DROP POLICY IF EXISTS inv_shipment_lines_update ON public.inv_shipment_lines;
DROP POLICY IF EXISTS inv_shipment_lines_delete ON public.inv_shipment_lines;
DROP POLICY IF EXISTS inv_movements_insert ON public.inv_movements;

CREATE POLICY inv_items_write_ops ON public.inv_items FOR INSERT
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY inv_items_update_ops ON public.inv_items FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY inv_items_delete_ops ON public.inv_items FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY inv_locations_write_ops ON public.inv_locations FOR INSERT
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY inv_locations_update_ops ON public.inv_locations FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY inv_locations_delete_ops ON public.inv_locations FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY inv_po_insert ON public.inv_production_orders FOR INSERT
  WITH CHECK (
    public.app_user_role() IN ('admin', 'production_manager')
    AND created_by = auth.uid()
  );

CREATE POLICY inv_po_update ON public.inv_production_orders FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY inv_po_delete_ops ON public.inv_production_orders FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY inv_lines_in_insert ON public.inv_production_lines_in FOR INSERT
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY inv_lines_in_update ON public.inv_production_lines_in FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY inv_lines_in_delete ON public.inv_production_lines_in FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY inv_lines_out_insert ON public.inv_production_lines_out FOR INSERT
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY inv_lines_out_update ON public.inv_production_lines_out FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY inv_lines_out_delete ON public.inv_production_lines_out FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY inv_shipments_insert ON public.inv_shipments FOR INSERT
  WITH CHECK (
    public.app_user_role() IN ('admin', 'production_manager', 'sales')
    AND created_by = auth.uid()
  );

CREATE POLICY inv_shipments_update ON public.inv_shipments FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY inv_shipments_delete_ops ON public.inv_shipments FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY inv_shipment_lines_insert ON public.inv_shipment_lines FOR INSERT
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY inv_shipment_lines_update ON public.inv_shipment_lines FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY inv_shipment_lines_delete ON public.inv_shipment_lines FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY inv_movements_insert ON public.inv_movements FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.app_user_role() IN ('admin', 'production_manager')
      OR (
        public.app_user_role() IN ('sales', 'quality_officer')
        AND movement_type = 'RECEIPT'
      )
    )
  );

-- workforce
DROP POLICY IF EXISTS departments_manager_all ON public.departments;
DROP POLICY IF EXISTS workforce_employees_manager_all ON public.workforce_employees;
DROP POLICY IF EXISTS access_readers_manager_all ON public.access_readers;
DROP POLICY IF EXISTS access_events_manager_all ON public.access_events;
DROP POLICY IF EXISTS department_segments_manager_all ON public.department_time_segments;
DROP POLICY IF EXISTS lost_time_manager_all ON public.lost_time_incidents;
DROP POLICY IF EXISTS workforce_employees_employee_self ON public.workforce_employees;
DROP POLICY IF EXISTS access_events_employee_self ON public.access_events;
DROP POLICY IF EXISTS department_segments_employee_self ON public.department_time_segments;
DROP POLICY IF EXISTS lost_time_employee_self ON public.lost_time_incidents;
DROP POLICY IF EXISTS departments_employee_select ON public.departments;
DROP POLICY IF EXISTS access_readers_employee_select ON public.access_readers;

CREATE POLICY departments_ops_all ON public.departments FOR ALL
  USING (public.app_user_role() IN ('admin', 'production_manager'))
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY workforce_employees_ops_all ON public.workforce_employees FOR ALL
  USING (public.app_user_role() IN ('admin', 'production_manager'))
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY access_readers_ops_all ON public.access_readers FOR ALL
  USING (public.app_user_role() IN ('admin', 'production_manager'))
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY access_events_ops_all ON public.access_events FOR ALL
  USING (public.app_user_role() IN ('admin', 'production_manager'))
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY department_segments_ops_all ON public.department_time_segments FOR ALL
  USING (public.app_user_role() IN ('admin', 'production_manager'))
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY lost_time_ops_all ON public.lost_time_incidents FOR ALL
  USING (public.app_user_role() IN ('admin', 'production_manager'))
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY workforce_employees_self_select ON public.workforce_employees FOR SELECT
  USING (
    profile_id = auth.uid()
    AND public.app_user_role() IS NOT NULL
  );

CREATE POLICY access_events_self_select ON public.access_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workforce_employees we
      WHERE we.id = access_events.workforce_employee_id
        AND we.profile_id = auth.uid()
    )
  );

CREATE POLICY department_segments_self_select ON public.department_time_segments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workforce_employees we
      WHERE we.id = department_time_segments.workforce_employee_id
        AND we.profile_id = auth.uid()
    )
  );

CREATE POLICY lost_time_self_select ON public.lost_time_incidents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workforce_employees we
      WHERE we.id = lost_time_incidents.workforce_employee_id
        AND we.profile_id = auth.uid()
    )
  );

CREATE POLICY departments_authenticated_select ON public.departments FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY access_readers_authenticated_select ON public.access_readers FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

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
    IF public.app_user_role() IS DISTINCT FROM 'admin'
       AND public.app_user_role() IS DISTINCT FROM 'production_manager' THEN
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

-- quotes / invoicing
DROP POLICY IF EXISTS quote_requests_update_mgr_emp ON public.quote_requests;
DROP POLICY IF EXISTS quote_requests_delete_mgr ON public.quote_requests;
DROP POLICY IF EXISTS quotes_insert_mgr_emp ON public.quotes;
DROP POLICY IF EXISTS quotes_update_mgr_emp ON public.quotes;
DROP POLICY IF EXISTS quotes_delete_mgr ON public.quotes;
DROP POLICY IF EXISTS quote_lines_insert_mgr_emp ON public.quote_lines;
DROP POLICY IF EXISTS quote_lines_update_mgr_emp ON public.quote_lines;
DROP POLICY IF EXISTS quote_lines_delete_mgr_emp ON public.quote_lines;
DROP POLICY IF EXISTS invoices_insert_mgr_emp ON public.invoices;
DROP POLICY IF EXISTS invoices_update_mgr_emp ON public.invoices;
DROP POLICY IF EXISTS invoices_delete_mgr ON public.invoices;
DROP POLICY IF EXISTS invoice_lines_insert_mgr_emp ON public.invoice_lines;
DROP POLICY IF EXISTS invoice_lines_update_mgr_emp ON public.invoice_lines;
DROP POLICY IF EXISTS invoice_lines_delete_mgr_emp ON public.invoice_lines;

CREATE POLICY quote_requests_update_ops_sales ON public.quote_requests FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer'));

CREATE POLICY quote_requests_delete_ops ON public.quote_requests FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY quotes_insert_ops_sales ON public.quotes FOR INSERT
  WITH CHECK (
    public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer')
    AND created_by = auth.uid()
  );

CREATE POLICY quotes_update_ops_sales ON public.quotes FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer'));

CREATE POLICY quotes_delete_ops ON public.quotes FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY quote_lines_insert_ops_sales ON public.quote_lines FOR INSERT
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer'));

CREATE POLICY quote_lines_update_ops_sales ON public.quote_lines FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer'));

CREATE POLICY quote_lines_delete_ops_sales ON public.quote_lines FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer'));

CREATE POLICY invoices_insert_ops_sales ON public.invoices FOR INSERT
  WITH CHECK (
    public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer')
    AND created_by = auth.uid()
  );

CREATE POLICY invoices_update_ops_sales ON public.invoices FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer'));

CREATE POLICY invoices_delete_ops ON public.invoices FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY invoice_lines_insert_ops_sales ON public.invoice_lines FOR INSERT
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer'));

CREATE POLICY invoice_lines_update_ops_sales ON public.invoice_lines FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer'));

CREATE POLICY invoice_lines_delete_ops_sales ON public.invoice_lines FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer'));

-- ---------------------------------------------------------------------------
-- 3) Inventory extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.inv_items
  ADD COLUMN IF NOT EXISTS reorder_min NUMERIC(18, 4) NOT NULL DEFAULT 0;

ALTER TABLE public.inv_shipments
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS planned_ship_date DATE,
  ADD COLUMN IF NOT EXISTS logistics_notes TEXT;

CREATE TABLE public.inv_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  item_id UUID NOT NULL REFERENCES public.inv_items (id) ON DELETE CASCADE,
  lot_code TEXT NOT NULL,
  qty NUMERIC(18, 4) NOT NULL DEFAULT 0,
  location_id UUID REFERENCES public.inv_locations (id) ON DELETE SET NULL,
  expires_on DATE,
  CONSTRAINT inv_lots_item_lot_unique UNIQUE (item_id, lot_code)
);

CREATE INDEX inv_lots_item_idx ON public.inv_lots (item_id);

ALTER TABLE public.inv_movements
  ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES public.inv_lots (id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 4) Contact logs & documents
-- ---------------------------------------------------------------------------
CREATE TABLE public.contact_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contact_id UUID NOT NULL REFERENCES public.contacts (id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'note' CHECK (kind IN ('call', 'email', 'meeting', 'note', 'visit', 'other')),
  subject TEXT NOT NULL,
  body TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE
);

CREATE INDEX contact_logs_contact_idx ON public.contact_logs (contact_id, occurred_at DESC);

CREATE TABLE public.contact_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contact_id UUID NOT NULL REFERENCES public.contacts (id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE
);

CREATE INDEX contact_documents_contact_idx ON public.contact_documents (contact_id);

-- ---------------------------------------------------------------------------
-- 5) Sales orders & related
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS sales_order_number_seq START WITH 1001;

CREATE TABLE public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_number TEXT NOT NULL UNIQUE DEFAULT (
    'SO-' || lpad(nextval('sales_order_number_seq')::text, 6, '0')
  ),
  contact_id UUID REFERENCES public.contacts (id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals (id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes (id) ON DELETE SET NULL,
  fabric_type TEXT,
  gsm NUMERIC(10, 2),
  width_cm NUMERIC(10, 2),
  color TEXT,
  finish TEXT,
  status TEXT NOT NULL DEFAULT 'quotation' CHECK (status IN (
    'quotation', 'sample_pending', 'sample_approved', 'production',
    'quality_hold', 'quality_passed', 'shipping', 'delivered', 'cancelled'
  )),
  owner_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  notes TEXT
);

CREATE INDEX sales_orders_status_idx ON public.sales_orders (status);
CREATE INDEX sales_orders_owner_idx ON public.sales_orders (owner_id);

CREATE TRIGGER sales_orders_updated_at
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.sample_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'in_lab', 'approved', 'rejected')),
  tracking_notes TEXT,
  rejected_reason TEXT,
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE
);

CREATE INDEX sample_requests_order_idx ON public.sample_requests (sales_order_id);

CREATE TRIGGER sample_requests_updated_at
  BEFORE UPDATE ON public.sample_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.factory_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  code TEXT NOT NULL UNIQUE,
  sales_order_id UUID REFERENCES public.sales_orders (id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'held')),
  planned_start TIMESTAMPTZ,
  planned_end TIMESTAMPTZ,
  machine_line TEXT,
  inv_production_order_id UUID REFERENCES public.inv_production_orders (id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE
);

CREATE INDEX factory_work_orders_order_idx ON public.factory_work_orders (sales_order_id);
CREATE INDEX factory_work_orders_status_idx ON public.factory_work_orders (status);

CREATE TRIGGER factory_work_orders_updated_at
  BEFORE UPDATE ON public.factory_work_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6) Quality control
-- ---------------------------------------------------------------------------
CREATE TABLE public.qc_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sales_order_id UUID REFERENCES public.sales_orders (id) ON DELETE SET NULL,
  factory_work_order_id UUID REFERENCES public.factory_work_orders (id) ON DELETE SET NULL,
  roll_id TEXT,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'pending')),
  notes TEXT,
  inspector_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE
);

CREATE INDEX qc_inspections_order_idx ON public.qc_inspections (sales_order_id);
CREATE INDEX qc_inspections_result_idx ON public.qc_inspections (result, created_at DESC);

CREATE TABLE public.qc_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  inspection_id UUID NOT NULL REFERENCES public.qc_inspections (id) ON DELETE CASCADE,
  defect_type TEXT NOT NULL,
  location_label TEXT,
  photo_url TEXT
);

CREATE INDEX qc_defects_inspection_idx ON public.qc_defects (inspection_id);

-- ---------------------------------------------------------------------------
-- 7) Automation
-- ---------------------------------------------------------------------------
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'qc_fail', 'stock_above', 'order_status', 'machine_downtime', 'manual'
  )),
  condition_json JSONB NOT NULL DEFAULT '{}',
  action_json JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE
);

CREATE TRIGGER automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.automation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rule_id UUID REFERENCES public.automation_rules (id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'applied', 'overridden', 'failed', 'cancelled'
  )),
  action_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'rule_engine' CHECK (source IN ('rule_engine', 'simulator', 'api')),
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE INDEX automation_actions_status_idx ON public.automation_actions (status, created_at DESC);

CREATE TABLE public.automation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  body TEXT,
  user_id UUID REFERENCES public.profiles (id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  meta JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX automation_alerts_user_idx ON public.automation_alerts (user_id, read_at, created_at DESC);

CREATE TABLE public.automation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  machine_line TEXT,
  sales_order_id UUID REFERENCES public.sales_orders (id) ON DELETE SET NULL,
  meta JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX automation_events_created_idx ON public.automation_events (created_at DESC);
CREATE INDEX automation_events_type_idx ON public.automation_events (event_type, created_at DESC);

-- ---------------------------------------------------------------------------
-- 8) RLS for new tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.inv_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY inv_lots_select ON public.inv_lots FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);
CREATE POLICY inv_lots_insert ON public.inv_lots FOR INSERT
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager'));
CREATE POLICY inv_lots_update ON public.inv_lots FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager'));
CREATE POLICY inv_lots_delete ON public.inv_lots FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY contact_logs_select ON public.contact_logs FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);
CREATE POLICY contact_logs_insert ON public.contact_logs FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.app_user_role() IS NOT NULL
  );
CREATE POLICY contact_logs_update_ops ON public.contact_logs FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager'));
CREATE POLICY contact_logs_delete_ops ON public.contact_logs FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY contact_documents_select ON public.contact_documents FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);
CREATE POLICY contact_documents_insert ON public.contact_documents FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND public.app_user_role() IS NOT NULL
  );
CREATE POLICY contact_documents_delete_ops ON public.contact_documents FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY sales_orders_select ON public.sales_orders FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);
CREATE POLICY sales_orders_insert ON public.sales_orders FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer')
  );
CREATE POLICY sales_orders_update ON public.sales_orders FOR UPDATE
  USING (
    public.app_user_role() IN ('admin', 'production_manager', 'quality_officer')
    OR (public.app_user_role() = 'sales' AND owner_id = auth.uid())
  );
CREATE POLICY sales_orders_delete_ops ON public.sales_orders FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY sample_requests_select ON public.sample_requests FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);
CREATE POLICY sample_requests_insert ON public.sample_requests FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer')
  );
CREATE POLICY sample_requests_update ON public.sample_requests FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer'));
CREATE POLICY sample_requests_delete ON public.sample_requests FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales', 'quality_officer'));

CREATE POLICY factory_wo_select ON public.factory_work_orders FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);
CREATE POLICY factory_wo_insert ON public.factory_work_orders FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.app_user_role() IN ('admin', 'production_manager')
  );
CREATE POLICY factory_wo_update ON public.factory_work_orders FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager'));
CREATE POLICY factory_wo_delete ON public.factory_work_orders FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY qc_insp_select ON public.qc_inspections FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);
CREATE POLICY qc_insp_insert ON public.qc_inspections FOR INSERT
  WITH CHECK (
    inspector_id = auth.uid()
    AND public.app_user_role() IN ('admin', 'production_manager', 'quality_officer')
  );
CREATE POLICY qc_insp_update ON public.qc_inspections FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'quality_officer'));
CREATE POLICY qc_insp_delete_ops ON public.qc_inspections FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));


CREATE POLICY qc_defects_select ON public.qc_defects FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);
CREATE POLICY qc_defects_insert ON public.qc_defects FOR INSERT
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager', 'quality_officer'));
CREATE POLICY qc_defects_update ON public.qc_defects FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'quality_officer'));
CREATE POLICY qc_defects_delete ON public.qc_defects FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'quality_officer'));

CREATE POLICY auto_rules_select ON public.automation_rules FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.app_user_role() IN ('admin', 'production_manager')
  );
CREATE POLICY auto_rules_insert ON public.automation_rules FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.app_user_role() IN ('admin', 'production_manager')
  );
CREATE POLICY auto_rules_update ON public.automation_rules FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager'))
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager'));
CREATE POLICY auto_rules_delete_admin ON public.automation_rules FOR DELETE
  USING (public.app_user_role() = 'admin');

CREATE POLICY auto_actions_select ON public.automation_actions FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);
CREATE POLICY auto_actions_update ON public.automation_actions FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'quality_officer'));

CREATE POLICY auto_alerts_select ON public.automation_alerts FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.app_user_role() IS NOT NULL
    AND (
      user_id IS NULL
      OR user_id = auth.uid()
    )
  );
CREATE POLICY auto_alerts_update ON public.automation_alerts FOR UPDATE
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY auto_events_select ON public.automation_events FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

-- Triggers: QC fail → actions + alerts; order status → automation
CREATE OR REPLACE FUNCTION public.trg_qc_inspection_automation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.result = 'fail'
     AND (
       TG_OP = 'INSERT'
       OR (TG_OP = 'UPDATE' AND OLD.result IS DISTINCT FROM NEW.result)
     ) THEN
    INSERT INTO public.automation_actions (
      rule_id, status, action_type, summary, payload, source
    ) VALUES (
      NULL,
      'pending',
      'supplier_ncr',
      'QC failed — review supplier non-conformance',
      jsonb_build_object('inspection_id', NEW.id, 'sales_order_id', NEW.sales_order_id),
      'rule_engine'
    );
    INSERT INTO public.automation_alerts (
      severity, title, body, user_id, meta
    ) VALUES (
      'warning',
      'QC failure',
      COALESCE('Inspection ' || NEW.roll_id, 'Inspection') || ' marked fail',
      NULL,
      jsonb_build_object('inspection_id', NEW.id)
    );
    INSERT INTO public.automation_events (event_type, message, sales_order_id, meta)
    VALUES (
      'quality',
      'QC inspection failed' || COALESCE(' — roll ' || NEW.roll_id, ''),
      NEW.sales_order_id,
      jsonb_build_object('inspection_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER qc_inspection_automation
  AFTER INSERT OR UPDATE OF result ON public.qc_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_qc_inspection_automation();

CREATE OR REPLACE FUNCTION public.trg_sales_order_status_automation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'quality_passed' THEN
      INSERT INTO public.automation_actions (
        rule_id, status, action_type, summary, payload, source
      ) VALUES (
        NULL,
        'pending',
        'shipping_docs',
        'Generate shipping documents and notify logistics',
        jsonb_build_object('sales_order_id', NEW.id, 'order_number', NEW.order_number),
        'rule_engine'
      );
      INSERT INTO public.automation_events (event_type, message, sales_order_id, meta)
      VALUES (
        'workflow',
        'Order ' || NEW.order_number || ' — quality passed, shipping workflow started',
        NEW.id,
        jsonb_build_object('order_number', NEW.order_number)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sales_order_status_automation
  AFTER UPDATE OF status ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sales_order_status_automation();
