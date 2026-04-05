-- Per-SKU targets (30-day baseline; reports scale to selected period).
ALTER TABLE public.inv_items
  ADD COLUMN IF NOT EXISTS sales_target_qty double precision;

ALTER TABLE public.inv_items
  ADD COLUMN IF NOT EXISTS production_target_qty double precision;

COMMENT ON COLUMN public.inv_items.sales_target_qty IS 'Expected shipped qty per ~30-day window; scaled in reports.';
COMMENT ON COLUMN public.inv_items.production_target_qty IS 'Expected production output qty per ~30-day window; scaled in reports.';
