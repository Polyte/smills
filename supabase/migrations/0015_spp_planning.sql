-- Sales & Production Planning: monthly trackers, pipeline lines, weekly plan/actual, variance analysis.
-- Depends on 0010_factory_operations (profiles, sales_orders).

-- ---------------------------------------------------------------------------
-- Enums as check constraints
-- ---------------------------------------------------------------------------
CREATE TABLE public.spp_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  year_month TEXT NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),
  product_line TEXT NOT NULL CHECK (product_line IN ('yarn', 'weaving')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  week_starts_on TEXT NOT NULL DEFAULT 'monday' CHECK (week_starts_on IN ('monday', 'sunday', 'saturday')),
  snapshot_at TIMESTAMPTZ,
  opening_import_id UUID,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  UNIQUE (year_month, product_line)
);

CREATE TABLE public.spp_pipeline_import (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tracker_id UUID NOT NULL REFERENCES public.spp_tracker (id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  is_opening_snapshot BOOLEAN NOT NULL DEFAULT false,
  imported_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE
);

ALTER TABLE public.spp_tracker
  ADD CONSTRAINT spp_tracker_opening_import_fk
  FOREIGN KEY (opening_import_id) REFERENCES public.spp_pipeline_import (id) ON DELETE SET NULL;

CREATE TABLE public.spp_order_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tracker_id UUID NOT NULL REFERENCES public.spp_tracker (id) ON DELETE CASCADE,
  pipeline_import_id UUID REFERENCES public.spp_pipeline_import (id) ON DELETE SET NULL,
  erp_order_ref TEXT NOT NULL,
  line_key TEXT NOT NULL DEFAULT '',
  customer_name TEXT,
  pcode TEXT,
  item_description TEXT,
  ordered_qty NUMERIC(18, 4),
  uom TEXT,
  del_date DATE,
  unit_price NUMERIC(18, 4),
  unit_label TEXT,
  deliver_qty NUMERIC(18, 4),
  balance_qty NUMERIC(18, 4),
  from_opening_pipeline BOOLEAN NOT NULL DEFAULT true,
  is_ad_hoc BOOLEAN NOT NULL DEFAULT false,
  sales_order_id UUID REFERENCES public.sales_orders (id) ON DELETE SET NULL,
  UNIQUE (tracker_id, erp_order_ref, line_key)
);

CREATE INDEX spp_order_line_tracker_idx ON public.spp_order_line (tracker_id);
CREATE INDEX spp_order_line_ad_hoc_idx ON public.spp_order_line (tracker_id, is_ad_hoc);

CREATE TABLE public.spp_monthly_target (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  spp_order_line_id UUID NOT NULL REFERENCES public.spp_order_line (id) ON DELETE CASCADE,
  target_qty NUMERIC(18, 4),
  target_value_zar NUMERIC(18, 4),
  UNIQUE (spp_order_line_id)
);

CREATE TABLE public.spp_weekly_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  spp_order_line_id UUID NOT NULL REFERENCES public.spp_order_line (id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  planned_qty NUMERIC(18, 4),
  planned_value_zar NUMERIC(18, 4),
  UNIQUE (spp_order_line_id, week_start)
);

CREATE INDEX spp_weekly_plan_week_idx ON public.spp_weekly_plan (week_start);

CREATE TABLE public.spp_actual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  spp_order_line_id UUID NOT NULL REFERENCES public.spp_order_line (id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  granularity TEXT NOT NULL CHECK (granularity IN ('day', 'week')),
  actual_qty NUMERIC(18, 4),
  actual_value_zar NUMERIC(18, 4),
  entered_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  UNIQUE (spp_order_line_id, period_start, granularity)
);

CREATE INDEX spp_actual_line_idx ON public.spp_actual (spp_order_line_id);

CREATE TABLE public.spp_variance_note (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  spp_order_line_id UUID NOT NULL REFERENCES public.spp_order_line (id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  analysis_text TEXT,
  deviation_reasons TEXT[] NOT NULL DEFAULT '{}',
  UNIQUE (spp_order_line_id, week_start)
);

CREATE INDEX spp_variance_note_week_idx ON public.spp_variance_note (week_start);

CREATE TRIGGER spp_tracker_updated_at
  BEFORE UPDATE ON public.spp_tracker
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER spp_order_line_updated_at
  BEFORE UPDATE ON public.spp_order_line
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER spp_monthly_target_updated_at
  BEFORE UPDATE ON public.spp_monthly_target
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER spp_weekly_plan_updated_at
  BEFORE UPDATE ON public.spp_weekly_plan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER spp_actual_updated_at
  BEFORE UPDATE ON public.spp_actual
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER spp_variance_note_updated_at
  BEFORE UPDATE ON public.spp_variance_note
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.spp_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spp_pipeline_import ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spp_order_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spp_monthly_target ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spp_weekly_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spp_actual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spp_variance_note ENABLE ROW LEVEL SECURITY;

-- Authenticated CRM users: read all planning data
CREATE POLICY spp_tracker_select ON public.spp_tracker FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY spp_pipeline_import_select ON public.spp_pipeline_import FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY spp_order_line_select ON public.spp_order_line FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY spp_monthly_target_select ON public.spp_monthly_target FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY spp_weekly_plan_select ON public.spp_weekly_plan FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY spp_actual_select ON public.spp_actual FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY spp_variance_note_select ON public.spp_variance_note FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

-- Write: admin, production_manager, sales
CREATE POLICY spp_tracker_insert ON public.spp_tracker FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.app_user_role() IN ('admin', 'production_manager', 'sales')
  );

CREATE POLICY spp_tracker_update ON public.spp_tracker FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY spp_tracker_delete ON public.spp_tracker FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY spp_pipeline_import_insert ON public.spp_pipeline_import FOR INSERT
  WITH CHECK (
    imported_by = auth.uid()
    AND public.app_user_role() IN ('admin', 'production_manager', 'sales')
  );

CREATE POLICY spp_pipeline_import_update ON public.spp_pipeline_import FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY spp_pipeline_import_delete ON public.spp_pipeline_import FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager'));

CREATE POLICY spp_order_line_insert ON public.spp_order_line FOR INSERT
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY spp_order_line_update ON public.spp_order_line FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY spp_order_line_delete ON public.spp_order_line FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY spp_monthly_target_insert ON public.spp_monthly_target FOR INSERT
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY spp_monthly_target_update ON public.spp_monthly_target FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY spp_monthly_target_delete ON public.spp_monthly_target FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY spp_weekly_plan_insert ON public.spp_weekly_plan FOR INSERT
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY spp_weekly_plan_update ON public.spp_weekly_plan FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY spp_weekly_plan_delete ON public.spp_weekly_plan FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY spp_actual_insert ON public.spp_actual FOR INSERT
  WITH CHECK (
    entered_by = auth.uid()
    AND public.app_user_role() IN ('admin', 'production_manager', 'sales')
  );

CREATE POLICY spp_actual_update ON public.spp_actual FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY spp_actual_delete ON public.spp_actual FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY spp_variance_note_insert ON public.spp_variance_note FOR INSERT
  WITH CHECK (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY spp_variance_note_update ON public.spp_variance_note FOR UPDATE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales'));

CREATE POLICY spp_variance_note_delete ON public.spp_variance_note FOR DELETE
  USING (public.app_user_role() IN ('admin', 'production_manager', 'sales'));
