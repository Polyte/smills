-- Warehouse / inventory (full chain). Depends on 0001_crm (profiles, deals).

CREATE TABLE public.inv_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('raw', 'wip', 'finished')),
  uom TEXT NOT NULL DEFAULT 'ea',
  standard_cost NUMERIC(14, 4) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.inv_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  zone TEXT NOT NULL CHECK (zone IN ('receiving', 'production', 'wip', 'warehouse', 'export', 'quarantine')),
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE public.inv_production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'released', 'completed', 'cancelled')),
  notes TEXT,
  issue_location_id UUID NOT NULL REFERENCES public.inv_locations (id),
  receipt_location_id UUID NOT NULL REFERENCES public.inv_locations (id),
  released_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE
);

CREATE TABLE public.inv_production_lines_in (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES public.inv_production_orders (id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inv_items (id) ON DELETE RESTRICT,
  qty_planned NUMERIC(18, 4) NOT NULL,
  qty_actual NUMERIC(18, 4)
);

CREATE TABLE public.inv_production_lines_out (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES public.inv_production_orders (id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inv_items (id) ON DELETE RESTRICT,
  qty_planned NUMERIC(18, 4) NOT NULL,
  qty_actual NUMERIC(18, 4)
);

CREATE TABLE public.inv_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'picked', 'shipped', 'cancelled')),
  deal_id UUID REFERENCES public.deals (id) ON DELETE SET NULL,
  shipped_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE
);

CREATE TABLE public.inv_shipment_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.inv_shipments (id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inv_items (id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES public.inv_locations (id) ON DELETE RESTRICT,
  qty NUMERIC(18, 4) NOT NULL CHECK (qty > 0)
);

CREATE TABLE public.inv_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'RECEIPT', 'TRANSFER_OUT', 'TRANSFER_IN', 'PRODUCTION_ISSUE', 'PRODUCTION_RECEIPT',
    'ADJUSTMENT', 'SHIPMENT'
  )),
  item_id UUID NOT NULL REFERENCES public.inv_items (id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES public.inv_locations (id) ON DELETE RESTRICT,
  qty_delta NUMERIC(18, 4) NOT NULL,
  unit_cost NUMERIC(14, 4),
  source TEXT CHECK (source IS NULL OR source IN ('import', 'local_purchase')),
  notes TEXT,
  ref_production_order_id UUID REFERENCES public.inv_production_orders (id) ON DELETE SET NULL,
  ref_shipment_id UUID REFERENCES public.inv_shipments (id) ON DELETE SET NULL,
  ref_deal_id UUID REFERENCES public.deals (id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE
);

CREATE INDEX inv_movements_item_loc_idx ON public.inv_movements (item_id, location_id);
CREATE INDEX inv_movements_created_at_idx ON public.inv_movements (created_at DESC);
CREATE INDEX inv_movements_po_idx ON public.inv_movements (ref_production_order_id);
CREATE INDEX inv_movements_ship_idx ON public.inv_movements (ref_shipment_id);
CREATE INDEX inv_production_lines_in_po_idx ON public.inv_production_lines_in (production_order_id);
CREATE INDEX inv_production_lines_out_po_idx ON public.inv_production_lines_out (production_order_id);
CREATE INDEX inv_shipment_lines_ship_idx ON public.inv_shipment_lines (shipment_id);

CREATE TRIGGER inv_items_updated_at
  BEFORE UPDATE ON public.inv_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inv_locations_updated_at
  BEFORE UPDATE ON public.inv_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inv_production_orders_updated_at
  BEFORE UPDATE ON public.inv_production_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inv_shipments_updated_at
  BEFORE UPDATE ON public.inv_shipments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE VIEW public.inv_stock_balances AS
SELECT
  m.item_id,
  m.location_id,
  SUM(m.qty_delta)::NUMERIC(18, 4) AS qty
FROM public.inv_movements m
INNER JOIN public.inv_items i ON i.id = m.item_id AND i.is_active = true
GROUP BY m.item_id, m.location_id;

ALTER TABLE public.inv_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_production_lines_in ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_production_lines_out ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_shipment_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_movements ENABLE ROW LEVEL SECURITY;

-- Authenticated users with a CRM role may read inventory
CREATE POLICY inv_items_select ON public.inv_items FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY inv_items_write_mgr_emp ON public.inv_items FOR INSERT
  WITH CHECK (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY inv_items_update_mgr_emp ON public.inv_items FOR UPDATE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY inv_items_delete_mgr ON public.inv_items FOR DELETE
  USING (public.app_user_role() = 'manager');

CREATE POLICY inv_locations_select ON public.inv_locations FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY inv_locations_write_mgr_emp ON public.inv_locations FOR INSERT
  WITH CHECK (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY inv_locations_update_mgr_emp ON public.inv_locations FOR UPDATE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY inv_locations_delete_mgr ON public.inv_locations FOR DELETE
  USING (public.app_user_role() = 'manager');

CREATE POLICY inv_po_select ON public.inv_production_orders FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY inv_po_insert ON public.inv_production_orders FOR INSERT
  WITH CHECK (
    public.app_user_role() IN ('manager', 'employee')
    AND created_by = auth.uid()
  );

CREATE POLICY inv_po_update ON public.inv_production_orders FOR UPDATE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY inv_po_delete_mgr ON public.inv_production_orders FOR DELETE
  USING (public.app_user_role() = 'manager');

CREATE POLICY inv_lines_in_select ON public.inv_production_lines_in FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY inv_lines_in_insert ON public.inv_production_lines_in FOR INSERT
  WITH CHECK (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY inv_lines_in_update ON public.inv_production_lines_in FOR UPDATE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY inv_lines_in_delete ON public.inv_production_lines_in FOR DELETE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY inv_lines_out_insert ON public.inv_production_lines_out FOR INSERT
  WITH CHECK (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY inv_lines_out_update ON public.inv_production_lines_out FOR UPDATE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY inv_lines_out_delete ON public.inv_production_lines_out FOR DELETE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY inv_lines_out_select ON public.inv_production_lines_out FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY inv_shipments_select ON public.inv_shipments FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY inv_shipments_insert ON public.inv_shipments FOR INSERT
  WITH CHECK (
    public.app_user_role() IN ('manager', 'employee')
    AND created_by = auth.uid()
  );

CREATE POLICY inv_shipments_update ON public.inv_shipments FOR UPDATE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY inv_shipments_delete_mgr ON public.inv_shipments FOR DELETE
  USING (public.app_user_role() = 'manager');

CREATE POLICY inv_shipment_lines_insert ON public.inv_shipment_lines FOR INSERT
  WITH CHECK (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY inv_shipment_lines_update ON public.inv_shipment_lines FOR UPDATE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY inv_shipment_lines_delete ON public.inv_shipment_lines FOR DELETE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY inv_shipment_lines_select ON public.inv_shipment_lines FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY inv_movements_select ON public.inv_movements FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY inv_movements_insert ON public.inv_movements FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.app_user_role() IN ('manager', 'employee')
      OR (
        public.app_user_role() = 'staff'
        AND movement_type = 'RECEIPT'
      )
    )
  );
