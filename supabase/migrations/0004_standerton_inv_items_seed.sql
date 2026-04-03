-- Default inventory items matching Standerton Mills public product lines
-- https://www.standertonmills.co.za/ — idempotent on sku

INSERT INTO public.inv_items (sku, name, kind, uom, standard_cost, is_active)
VALUES
  ('SM-RM-COT-LINT', 'Cotton lint / ginned cotton (incoming)', 'raw', 'kg', 0, true),
  ('SM-RM-PET-FIB', 'Polyester staple fibre (synthetic)', 'raw', 'kg', 0, true),
  ('SM-RM-ACY-FIB', 'Acrylic fibre', 'raw', 'kg', 0, true),
  ('SM-RM-BLEND-FIB', 'Blended fibre mix (cotton/synthetic/acrylic)', 'raw', 'kg', 0, true),
  ('SM-RM-MONO', 'Monofilament / structural base yarn (incoming)', 'raw', 'kg', 0, true),
  ('SM-WIP-SLIVER', 'Carded sliver (spinning WIP)', 'wip', 'kg', 0, true),
  ('SM-WIP-ROV', 'Roving (spinning WIP)', 'wip', 'kg', 0, true),
  ('SM-WIP-YARN-OD', 'Yarn on draft / machine WIP', 'wip', 'kg', 0, true),
  ('SM-YRN-N32-CB', 'Ne 32/1 ring yarn, cotton blend cone (dye-ready available)', 'finished', 'cone', 0, true),
  ('SM-YRN-N60-COMP', 'Ne 60/1 compact cotton cone', 'finished', 'cone', 0, true),
  ('SM-YRN-PET-IND', 'Polyester industrial base yarn cone', 'finished', 'cone', 0, true),
  ('SM-YRN-ACY-TEX', 'Acrylic blend technical yarn cone', 'finished', 'cone', 0, true),
  ('SM-YRN-PLY-CAB', 'Ply & cabled technical yarn', 'finished', 'cone', 0, true),
  ('SM-YRN-FIN-SPEC', 'Special finish / dye-ready yarn (as per spec)', 'finished', 'cone', 0, true),
  ('SM-TEX-WOV-480', 'Technical woven fabric, 480 g/m² greige roll', 'finished', 'roll', 0, true),
  ('SM-IND-WOV-850', 'Industrial woven fabric, 850 g/m² heavy-duty roll', 'finished', 'roll', 0, true),
  ('SM-WOV-GREIGE-220', 'Woven greige 220 g/m², variable width', 'finished', 'roll', 0, true),
  ('SM-TWL-IND', 'Industrial towelling greige', 'finished', 'roll', 0, true),
  ('SM-FG-COATED', 'Coated & finished woven goods (customer spec)', 'finished', 'roll', 0, true),
  ('SM-AGR-SHADE', 'Agricultural shade net / agri textile (strip or roll)', 'finished', 'm', 0, true),
  ('SM-SOL-CUSTOM', 'Bespoke textile solution (custom quote)', 'finished', 'ea', 0, true),
  ('SM-FG-EXPORT', 'Export-packed finished goods (yarn & fabric)', 'finished', 'ea', 0, true)
ON CONFLICT (sku) DO NOTHING;
