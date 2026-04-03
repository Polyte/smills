-- Value on hand should include inactive catalog SKUs that still have ledger qty.

CREATE OR REPLACE VIEW public.inv_stock_balances AS
SELECT
  m.item_id,
  m.location_id,
  SUM(m.qty_delta)::NUMERIC(18, 4) AS qty
FROM public.inv_movements m
INNER JOIN public.inv_items i ON i.id = m.item_id
GROUP BY m.item_id, m.location_id;
