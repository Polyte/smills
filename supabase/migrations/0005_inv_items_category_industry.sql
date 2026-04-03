-- Product category + sector description; industry-served SKU seeds (idempotent on sku)

ALTER TABLE public.inv_items
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Mill & yarn';

ALTER TABLE public.inv_items
  ADD COLUMN IF NOT EXISTS description TEXT;

INSERT INTO public.inv_items (sku, name, kind, uom, standard_cost, is_active, category, description)
VALUES
  ('SM-CAT-MIN-UG', 'Underground mining', 'finished', 'roll', 0, true, 'Mining',
   'Heavy-duty conveyor belt fabrics designed to withstand the demanding conditions of South African mines.'),
  ('SM-CAT-MIN-OP', 'Open-pit operations', 'finished', 'roll', 0, true, 'Mining',
   'Heavy-duty conveyor belt fabrics designed to withstand the demanding conditions of South African mines.'),
  ('SM-CAT-MIN-PROC', 'Mineral processing', 'finished', 'roll', 0, true, 'Mining',
   'Heavy-duty conveyor belt fabrics designed to withstand the demanding conditions of South African mines.'),
  ('SM-CAT-MFG-CONV', 'Conveyor systems', 'finished', 'roll', 0, true, 'Manufacturing',
   'Technical fabrics for various manufacturing applications, from industrial equipment to consumer goods.'),
  ('SM-CAT-MFG-EQP', 'Industrial equipment', 'finished', 'roll', 0, true, 'Manufacturing',
   'Technical fabrics for various manufacturing applications, from industrial equipment to consumer goods.'),
  ('SM-CAT-MFG-CUST', 'Custom applications', 'finished', 'roll', 0, true, 'Manufacturing',
   'Technical fabrics for various manufacturing applications, from industrial equipment to consumer goods.'),
  ('SM-CAT-CNS-SCAF', 'Scaffolding nets', 'finished', 'roll', 0, true, 'Construction',
   'Durable fabrics for construction applications including safety equipment and material handling.'),
  ('SM-CAT-CNS-SAFE', 'Safety barriers', 'finished', 'roll', 0, true, 'Construction',
   'Durable fabrics for construction applications including safety equipment and material handling.'),
  ('SM-CAT-CNS-TRANS', 'Material transport', 'finished', 'roll', 0, true, 'Construction',
   'Durable fabrics for construction applications including safety equipment and material handling.'),
  ('SM-CAT-CLN-MOP', 'Industrial mops', 'finished', 'roll', 0, true, 'Cleaning & Hygiene',
   'High-absorbency mop head fabrics for industrial and commercial cleaning applications.'),
  ('SM-CAT-CLN-CLOTH', 'Cleaning cloths', 'finished', 'roll', 0, true, 'Cleaning & Hygiene',
   'High-absorbency mop head fabrics for industrial and commercial cleaning applications.'),
  ('SM-CAT-CLN-HYG', 'Hygiene products', 'finished', 'roll', 0, true, 'Cleaning & Hygiene',
   'High-absorbency mop head fabrics for industrial and commercial cleaning applications.'),
  ('SM-CAT-AGR-SHADE', 'Shade cloth', 'finished', 'roll', 0, true, 'Agriculture',
   'Specialized fabrics for agricultural applications including crop protection and livestock farming.'),
  ('SM-CAT-AGR-COV', 'Protective covers', 'finished', 'roll', 0, true, 'Agriculture',
   'Specialized fabrics for agricultural applications including crop protection and livestock farming.'),
  ('SM-CAT-AGR-INFRA', 'Farm infrastructure', 'finished', 'roll', 0, true, 'Agriculture',
   'Specialized fabrics for agricultural applications including crop protection and livestock farming.'),
  ('SM-CAT-LOG-CVB', 'Conveyor belts', 'finished', 'roll', 0, true, 'Logistics',
   'Heavy-duty fabrics for logistics and material handling operations across various sectors.'),
  ('SM-CAT-LOG-SEC', 'Cargo securement', 'finished', 'roll', 0, true, 'Logistics',
   'Heavy-duty fabrics for logistics and material handling operations across various sectors.'),
  ('SM-CAT-LOG-WH', 'Warehouse operations', 'finished', 'roll', 0, true, 'Logistics',
   'Heavy-duty fabrics for logistics and material handling operations across various sectors.')
ON CONFLICT (sku) DO NOTHING;

UPDATE public.inv_items
SET category = 'Mill & yarn'
WHERE sku NOT LIKE 'SM-CAT-%'
  AND (category IS NULL OR trim(category) = '');
