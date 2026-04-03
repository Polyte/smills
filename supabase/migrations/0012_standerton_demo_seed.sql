-- Rich demo/dummy data for CRM, inventory, factory operations, quotes, workforce.
-- Idempotent: skips if marker contact exists.
-- Requires at least one row in public.profiles (sign up once, then apply migrations / push).

DO $seed$
DECLARE
  uid uuid;
  c1 uuid;
  c2 uuid;
  c3 uuid;
  d1 uuid;
  d2 uuid;
  it_yarn uuid;
  it_fabric uuid;
  it_raw uuid;
  loc_recv uuid;
  loc_wh uuid;
  loc_wip uuid;
  so_quote uuid;
  so_sample uuid;
  so_prod uuid;
  so_ship uuid;
  so_pass uuid;
  fwo1 uuid;
  qin1 uuid;
  qin2 uuid;
  qr1 uuid;
  q1 uuid;
  inv1 uuid;
  ship1 uuid;
  dept1 uuid;
  emp1 uuid;
  r_in uuid;
  po1 uuid;
BEGIN
  SELECT id INTO uid FROM public.profiles ORDER BY created_at LIMIT 1;
  IF uid IS NULL THEN
    RAISE NOTICE '0012 demo seed: no profiles yet — skip (add a Supabase user first).';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.contacts WHERE company_name = 'Demo: Lindela Weavers (Pty) Ltd') THEN
    RAISE NOTICE '0012 demo seed: already present — skip.';
    RETURN;
  END IF;

  -- CRM
  INSERT INTO public.contacts (
    company_name, contact_name, email, phone, type, status, owner_id, notes
  ) VALUES
    ('Demo: Lindela Weavers (Pty) Ltd', 'Thandi Mbeki', 'thandi.mbeki@lindela-demo.example', '+27 17 000 1001', 'customer', 'active', uid,
     '[demo-seed] Retail & workwear buyer — greige and finished rolls.'),
    ('Demo: ChemColour Suppliers', 'Johan van der Merwe', 'johan@chemcolour-demo.example', '+27 11 000 2002', 'supplier', 'active', uid,
     '[demo-seed] Dyes and finishing chemicals.'),
    ('Demo: Ndlovu Mining textiles', 'Sipho Ndlovu', 's.n@ndlovu-demo-mining.example', '+27 18 000 3003', 'lead', 'qualification', uid,
     '[demo-seed] Shade net and industrial woven RFQ.')
  RETURNING id INTO c1;
  SELECT id INTO c1 FROM public.contacts WHERE company_name = 'Demo: Lindela Weavers (Pty) Ltd' LIMIT 1;
  SELECT id INTO c2 FROM public.contacts WHERE company_name = 'Demo: ChemColour Suppliers' LIMIT 1;
  SELECT id INTO c3 FROM public.contacts WHERE company_name = 'Demo: Ndlovu Mining textiles' LIMIT 1;

  INSERT INTO public.deals (contact_id, title, stage, value_zar, owner_id, expected_close)
  VALUES
    (c1, 'Lindela — greige TW-480 annual', 'proposal', 1250000, uid, CURRENT_DATE + 30),
    (c3, 'Ndlovu — shade net tender', 'qualification', 420000, uid, CURRENT_DATE + 60)
  RETURNING id INTO d1;
  SELECT id INTO d1 FROM public.deals WHERE title = 'Lindela — greige TW-480 annual' LIMIT 1;
  SELECT id INTO d2 FROM public.deals WHERE title = 'Ndlovu — shade net tender' LIMIT 1;

  INSERT INTO public.activities (contact_id, deal_id, kind, subject, body, occurred_at, created_by)
  VALUES
    (c1, d1, 'call', 'Pricing follow-up', 'Discussed MOQ and lead time for SM-TEX-WOV-480.', now() - interval '2 days', uid),
    (c3, d2, 'email', 'Sent technical datasheet', 'Attached GSM and width options.', now() - interval '1 day', uid),
    (c2, NULL, 'meeting', 'Q1 chemical pricing', 'Agreed volume rebate on reactive dyes.', now() - interval '3 days', uid);

  INSERT INTO public.tasks (title, due_at, status, assignee_id, contact_id, deal_id, created_by)
  VALUES
    ('Send revised quote to Lindela', now() + interval '3 days', 'open', uid, c1, d1, uid),
    ('Schedule Ndlovu site visit', now() + interval '7 days', 'open', uid, c3, d2, uid);

  INSERT INTO public.contact_logs (contact_id, kind, subject, body, occurred_at, created_by)
  VALUES
    (c1, 'note', 'Credit check OK', 'Internal: payment terms 30 days.', now() - interval '5 days', uid),
    (c2, 'email', 'SDS received', 'Uploaded to file share (demo).', now() - interval '4 days', uid);

  -- Inventory baselines (use existing catalog SKUs)
  SELECT id INTO it_yarn FROM public.inv_items WHERE sku = 'SM-YRN-N32-CB' LIMIT 1;
  SELECT id INTO it_fabric FROM public.inv_items WHERE sku = 'SM-TEX-WOV-480' LIMIT 1;
  SELECT id INTO it_raw FROM public.inv_items WHERE sku = 'SM-RM-COT-LINT' LIMIT 1;
  IF it_yarn IS NULL THEN it_yarn := (SELECT id FROM public.inv_items LIMIT 1); END IF;
  IF it_fabric IS NULL THEN it_fabric := it_yarn; END IF;
  IF it_raw IS NULL THEN it_raw := it_yarn; END IF;

  UPDATE public.inv_items SET reorder_min = 400, standard_cost = 45, list_price_zar = 89 WHERE id = it_yarn;
  UPDATE public.inv_items SET reorder_min = 120, standard_cost = 120, list_price_zar = 210 WHERE id = it_fabric;

  SELECT id INTO loc_recv FROM public.inv_locations ORDER BY sort_order LIMIT 1;
  IF loc_recv IS NULL THEN
    INSERT INTO public.inv_locations (name, zone, sort_order) VALUES ('Demo Receiving', 'receiving', 0) RETURNING id INTO loc_recv;
  END IF;
  SELECT id INTO loc_wh FROM public.inv_locations WHERE zone = 'warehouse' ORDER BY sort_order LIMIT 1;
  IF loc_wh IS NULL THEN
    INSERT INTO public.inv_locations (name, zone, sort_order) VALUES ('Demo Warehouse A', 'warehouse', 2) RETURNING id INTO loc_wh;
  END IF;
  SELECT id INTO loc_wip FROM public.inv_locations WHERE zone = 'wip' ORDER BY sort_order LIMIT 1;
  IF loc_wip IS NULL THEN
    INSERT INTO public.inv_locations (name, zone, sort_order) VALUES ('Demo Weaving WIP', 'wip', 1) RETURNING id INTO loc_wip;
  END IF;

  INSERT INTO public.inv_movements (movement_type, item_id, location_id, qty_delta, unit_cost, source, notes, created_by)
  VALUES
    ('RECEIPT', it_raw, loc_recv, 5000, 28.5, 'local_purchase', '[demo-seed] Raw cotton received — weighbridge 08:23', uid),
    ('TRANSFER_IN', it_yarn, loc_wh, 2200, 45, NULL, '[demo-seed] Yarn cones to warehouse', uid),
    ('TRANSFER_IN', it_fabric, loc_wh, 85, 120, NULL, '[demo-seed] Finished greige rolls', uid),
    ('ADJUSTMENT', it_yarn, loc_wh, -350, NULL, NULL, '[demo-seed] Cycle count adjustment', uid);

  INSERT INTO public.inv_lots (item_id, lot_code, qty, location_id, expires_on)
  VALUES
    (it_yarn, 'DYELOT-2026-03-A', 1800, loc_wh, NULL),
    (it_fabric, 'ROLL-BATCH-8841', 42, loc_wh, CURRENT_DATE + 180),
    (it_raw, 'COT-RECV-APR01', 4200, loc_recv, NULL);

  -- Sales orders (order_number from sequence default)
  INSERT INTO public.sales_orders (
    contact_id, deal_id, fabric_type, gsm, width_cm, color, finish, status, owner_id, notes
  ) VALUES
    (c1, d1, 'Technical woven greige', 480, 165, 'Natural', 'Greige', 'quotation', uid, '[demo-seed] Initial quote'),
    (c1, d1, 'Ring yarn dyed', 32, NULL, 'Navy', 'Mercerised', 'sample_pending', uid, '[demo-seed] Awaiting lab approval'),
    (c3, d2, 'Shade net', 80, 200, 'Green', 'UV-stabilised', 'production', uid, '[demo-seed] In production'),
    (c1, NULL, 'Industrial woven', 850, 150, 'Black', 'Coated', 'shipping', uid, '[demo-seed] Ready to ship'),
    (c1, d1, 'TW-480 follow-on', 480, 165, 'Natural', 'Greige', 'quality_passed', uid, '[demo-seed] Passed QC — triggers workflow');

  SELECT id INTO so_quote FROM public.sales_orders WHERE notes LIKE '%Initial quote%' ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO so_sample FROM public.sales_orders WHERE notes LIKE '%Awaiting lab%' ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO so_prod FROM public.sales_orders WHERE notes LIKE '%In production%' ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO so_ship FROM public.sales_orders WHERE notes LIKE '%Ready to ship%' ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO so_pass FROM public.sales_orders WHERE notes LIKE '%Passed QC%' ORDER BY created_at DESC LIMIT 1;

  INSERT INTO public.sample_requests (sales_order_id, status, tracking_notes, created_by)
  VALUES
    (so_sample, 'in_lab', 'Sent to lab 09:15 — colour fastness series', uid);

  INSERT INTO public.factory_work_orders (code, sales_order_id, status, planned_start, planned_end, machine_line, notes, created_by)
  VALUES
    ('DEMO-FWO-001', so_prod, 'in_progress', now() - interval '1 day', now() + interval '2 days', 'Weave Line 2', '[demo-seed] Batch for Ndlovu tender', uid),
    ('DEMO-FWO-002', so_ship, 'planned', now() + interval '1 day', now() + interval '4 days', 'Knit Line 1', '[demo-seed] Coating run', uid)
  RETURNING id INTO fwo1;
  SELECT id INTO fwo1 FROM public.factory_work_orders WHERE code = 'DEMO-FWO-001' LIMIT 1;

  INSERT INTO public.qc_inspections (sales_order_id, factory_work_order_id, roll_id, result, notes, inspector_id)
  VALUES
    (so_prod, fwo1, 'ROLL-DEMO-234', 'fail', '[demo-seed] Edge defect cluster — will trigger automation', uid),
    (so_ship, NULL, 'ROLL-DEMO-881', 'pass', 'Within spec.', uid)
  RETURNING id INTO qin1;
  SELECT id INTO qin1 FROM public.qc_inspections WHERE roll_id = 'ROLL-DEMO-234' LIMIT 1;
  SELECT id INTO qin2 FROM public.qc_inspections WHERE roll_id = 'ROLL-DEMO-881' LIMIT 1;

  INSERT INTO public.qc_defects (inspection_id, defect_type, location_label, photo_url)
  VALUES
    (qin1, 'Slub / yarn fault', 'Leading edge left', 'https://picsum.photos/seed/qcdefect1/400/300'),
    (qin1, 'Colour streak', 'Centre 2 m', 'https://picsum.photos/seed/qcdefect2/400/300');

  -- Automation rules + narrative events
  INSERT INTO public.automation_rules (name, enabled, trigger_type, condition_json, action_json, created_by)
  VALUES
    ('Demo: QC fail → NCR email', true, 'qc_fail', '{"notify_roles":["quality_officer"]}'::jsonb, '{"template":"ncr_v1"}'::jsonb, uid),
    ('Demo: Stock above threshold reserve', true, 'stock_above', '{"sku":"SM-YRN-N32-CB","qty":1000}'::jsonb, '{"action":"reserve_next_order"}'::jsonb, uid);

  INSERT INTO public.automation_events (event_type, message, machine_line, sales_order_id, meta)
  VALUES
    ('inventory', 'Raw cotton received — 500 kg at 08:23 (weighbridge WH-01)', 'Receiving', NULL, '{"demo":true}'::jsonb),
    ('inventory', 'Finished roll ROLL-DEMO-234 scanned out for shipping prep', 'Warehouse', so_ship, '{"roll":"ROLL-DEMO-234"}'::jsonb),
    ('workflow', 'Stock low yarn — suggested PO #PO-DEMO-89', 'Planning', so_sample, '{"po":"PO-DEMO-89"}'::jsonb),
    ('machine', 'Dyeing vat 3 temperature excursion (recovered)', 'Dye Line', NULL, '{"temp_c":95,"setpoint":90}'::jsonb);

  INSERT INTO public.automation_alerts (severity, title, body, user_id, meta)
  VALUES
    ('info', 'Demo: scheduler idle', 'Line 4 awaiting next work order.', NULL, '{}'::jsonb),
    ('warning', 'Demo: shipment delay risk', 'Carrier booking not confirmed.', NULL, '{"order_ref":"SO"}'::jsonb);

  INSERT INTO public.automation_actions (rule_id, status, action_type, summary, payload, source)
  VALUES (
    NULL,
    'pending',
    'purchase_order',
    'Auto-generated PO draft for low cotton lint',
    '{"sku":"SM-RM-COT-LINT","qty_kg":8000}'::jsonb,
    'simulator'
  );

  -- Quotes pipeline
  INSERT INTO public.quote_requests (
    product_key, product_label, company_name, contact_name, email, phone, message, quantity, uom, status, assigned_owner_id, contact_id
  ) VALUES (
    'SM-TEX-WOV-480', 'Technical woven 480 g/m²', 'Lindela Weavers (Demo)', 'Thandi Mjeka', 'thandi.mbeki@lindela-demo.example', '+27 17 000 1001',
    'Need quote for 2500 m per month rolling.', 2500, 'm', 'reviewing', uid, c1
  ) RETURNING id INTO qr1;
  SELECT id INTO qr1 FROM public.quote_requests WHERE message LIKE '%2500 m per month%' ORDER BY created_at DESC LIMIT 1;

  INSERT INTO public.quotes (
    quote_request_id, quote_number, status, subtotal_zar, tax_rate, tax_zar, total_zar, currency, valid_until, created_by,
    customer_email_snapshot, customer_company_snapshot, customer_contact_snapshot
  ) VALUES (
    qr1, 'DEMO-QT-90001', 'sent', 380000, 0.15, 57000, 437000, 'ZAR', CURRENT_DATE + 14, uid,
    'thandi.mbeki@lindela-demo.example', 'Lindela Weavers (Demo)', 'Thandi Mbeki'
  ) RETURNING id INTO q1;
  SELECT id INTO q1 FROM public.quotes WHERE quote_number = 'DEMO-QT-90001' LIMIT 1;

  INSERT INTO public.quote_lines (quote_id, position, description, qty, unit_price_zar, line_total_zar)
  VALUES
    (q1, 0, 'SM-TEX-WOV-480 greige — monthly allocation', 2500, 120, 300000),
    (q1, 1, 'Logistics — palletised delivery', 1, 80000, 80000);

  INSERT INTO public.invoices (
    quote_id, invoice_number, status, subtotal_zar, tax_rate, tax_zar, total_zar, currency, due_date, created_by,
    customer_email_snapshot, customer_company_snapshot, customer_contact_snapshot
  ) VALUES (
    q1, 'DEMO-INV-70001', 'sent', 437000, 0.15, 65550, 502550, 'ZAR', CURRENT_DATE + 30, uid,
    'thandi.mbeki@lindela-demo.example', 'Lindela Weavers (Demo)', 'Thandi Mjeka'
  ) RETURNING id INTO inv1;
  SELECT id INTO inv1 FROM public.invoices WHERE invoice_number = 'DEMO-INV-70001' LIMIT 1;

  INSERT INTO public.invoice_lines (invoice_id, position, description, qty, unit_price_zar, line_total_zar)
  VALUES
    (inv1, 0, 'Per accepted quote DEMO-QT-90001', 1, 437000, 437000);

  -- Shipment + notification
  INSERT INTO public.inv_shipments (status, deal_id, created_by, tracking_number, planned_ship_date, logistics_notes)
  VALUES ('picked', d1, uid, 'SAPO-DEMO-TRK-778899', CURRENT_DATE + 2, '[demo-seed] 2 pallets cones + 1 roll');

  SELECT id INTO ship1 FROM public.inv_shipments WHERE tracking_number = 'SAPO-DEMO-TRK-778899' LIMIT 1;

  INSERT INTO public.inv_shipment_lines (shipment_id, item_id, location_id, qty)
  VALUES
    (ship1, it_yarn, loc_wh, 120),
    (ship1, it_fabric, loc_wh, 4);

  INSERT INTO public.inv_movements (movement_type, item_id, location_id, qty_delta, ref_shipment_id, created_by)
  VALUES
    ('SHIPMENT', it_yarn, loc_wh, -120, ship1, uid),
    ('SHIPMENT', it_fabric, loc_wh, -4, ship1, uid);

  INSERT INTO public.crm_notifications (user_id, kind, payload)
  VALUES (uid, 'quote_sent', '{"quote_number":"DEMO-QT-90001","demo":true}'::jsonb);

  -- Workforce snapshot
  INSERT INTO public.departments (name, code, sort_order) VALUES ('Spinning & twisting', 'DEMO-SPIN', 10) RETURNING id INTO dept1;
  SELECT id INTO dept1 FROM public.departments WHERE code = 'DEMO-SPIN' LIMIT 1;

  INSERT INTO public.workforce_employees (full_name, employee_number, rfid_uid, primary_department_id, phone, active)
  VALUES ('Demo: Precious Khumalo', 'EMP-DEMO-1001', 'DEADBEEF0001DEMO', dept1, '+27 82 000 4400', true)
  RETURNING id INTO emp1;
  SELECT id INTO emp1 FROM public.workforce_employees WHERE employee_number = 'EMP-DEMO-1001' LIMIT 1;

  INSERT INTO public.access_readers (name, reader_key, kind) VALUES ('Demo Main Gate In', 'DEMO-GATE-IN', 'facility_in') RETURNING id INTO r_in;
  SELECT id INTO r_in FROM public.access_readers WHERE reader_key = 'DEMO-GATE-IN' LIMIT 1;

  INSERT INTO public.access_events (occurred_at, workforce_employee_id, reader_id, rfid_raw, device_meta)
  VALUES (now() - interval '8 hours', emp1, r_in, 'tap1', '{"demo":true}'::jsonb);

  -- One production order chain (inventory module)
  INSERT INTO public.inv_production_orders (
    status, notes, issue_location_id, receipt_location_id, released_at, created_by
  ) VALUES (
    'released', '[demo-seed] Issue yarn for weaving', loc_wh, loc_wip, now() - interval '6 hours', uid
  ) RETURNING id INTO po1;
  SELECT id INTO po1 FROM public.inv_production_orders WHERE notes LIKE '%Issue yarn for weaving%' ORDER BY created_at DESC LIMIT 1;

  INSERT INTO public.inv_production_lines_in (production_order_id, item_id, qty_planned, qty_actual)
  VALUES (po1, it_yarn, 500, 500);
  INSERT INTO public.inv_production_lines_out (production_order_id, item_id, qty_planned, qty_actual)
  VALUES (po1, it_fabric, 40, NULL);

  RAISE NOTICE '0012 demo seed: inserted Standerton dummy data.';
END;
$seed$;
