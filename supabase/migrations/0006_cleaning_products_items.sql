-- Cleaning products category (idempotent on sku)

INSERT INTO public.inv_items (sku, name, kind, uom, standard_cost, is_active, category, description)
VALUES
  (
    'SM-CLEAN-APC',
    'All Purpose Cleaner',
    'finished',
    'ea',
    0,
    true,
    'Cleaning products',
    'Industrial and commercial cleaning formulations for general use, degreasing, and odour control.'
  ),
  (
    'SM-CLEAN-DEG',
    'Degreaser',
    'finished',
    'ea',
    0,
    true,
    'Cleaning products',
    'Industrial and commercial cleaning formulations for general use, degreasing, and odour control.'
  ),
  (
    'SM-CLEAN-ODO',
    'Odor Eliminator',
    'finished',
    'ea',
    0,
    true,
    'Cleaning products',
    'Industrial and commercial cleaning formulations for general use, degreasing, and odour control.'
  )
ON CONFLICT (sku) DO NOTHING;
