import type { Database, SqlValue } from "sql.js";
import initSqlJs from "sql.js";
// Vite resolves WASM for bundling
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { STANDERTON_CRM_PRODUCTS } from "../standertonProductCatalog";
import { INDUSTRY_SECTOR_PRODUCT_SEEDS } from "../industrySectorProductCatalog";

const ALL_INV_ITEM_SEEDS = [...STANDERTON_CRM_PRODUCTS, ...INDUSTRY_SECTOR_PRODUCT_SEEDS];

const IDB_NAME = "standerton-crm";
const IDB_STORE = "sqlite";
const IDB_KEY = "db";

let sqlModule: Awaited<ReturnType<typeof initSqlJs>> | null = null;
let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistDb();
  }, 400);
}

async function idbGet(): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(IDB_STORE, "readonly");
      const getReq = tx.objectStore(IDB_STORE).get(IDB_KEY);
      getReq.onsuccess = () => resolve(getReq.result ?? null);
      getReq.onerror = () => reject(getReq.error);
    };
  });
}

async function idbSet(data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(data, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

async function persistDb() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    await idbSet(data);
  } catch {
    /* ignore quota / private mode */
  }
}

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS crm_users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('admin','production_manager','sales','quality_officer')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  type TEXT NOT NULL DEFAULT 'lead' CHECK (type IN ('lead','customer','supplier')),
  status TEXT NOT NULL DEFAULT 'active',
  owner_id TEXT NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'qualification' CHECK (stage IN ('qualification','proposal','won','lost')),
  value_zar REAL,
  owner_id TEXT NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  expected_close TEXT
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id TEXT REFERENCES deals(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('call','email','meeting','note')),
  subject TEXT NOT NULL,
  body TEXT,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  title TEXT NOT NULL,
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','cancelled')),
  assignee_id TEXT NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id TEXT REFERENCES deals(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS contacts_owner_id_idx ON contacts(owner_id);
CREATE INDEX IF NOT EXISTS deals_contact_id_idx ON deals(contact_id);
CREATE INDEX IF NOT EXISTS activities_occurred_at_idx ON activities(occurred_at);
CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx ON tasks(assignee_id);

CREATE TABLE IF NOT EXISTS inv_items (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('raw','wip','finished')),
  uom TEXT NOT NULL DEFAULT 'ea',
  standard_cost REAL NOT NULL DEFAULT 0,
  list_price_zar REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT 'Mill & yarn',
  description TEXT
);

CREATE TABLE IF NOT EXISTS inv_locations (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT NOT NULL,
  zone TEXT NOT NULL CHECK (zone IN ('receiving','production','wip','warehouse','export','quarantine')),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inv_production_orders (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','released','completed','cancelled')),
  notes TEXT,
  issue_location_id TEXT NOT NULL REFERENCES inv_locations(id),
  receipt_location_id TEXT NOT NULL REFERENCES inv_locations(id),
  released_at TEXT,
  completed_at TEXT,
  created_by TEXT NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inv_production_lines_in (
  id TEXT PRIMARY KEY NOT NULL,
  production_order_id TEXT NOT NULL REFERENCES inv_production_orders(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES inv_items(id),
  qty_planned REAL NOT NULL,
  qty_actual REAL
);

CREATE TABLE IF NOT EXISTS inv_production_lines_out (
  id TEXT PRIMARY KEY NOT NULL,
  production_order_id TEXT NOT NULL REFERENCES inv_production_orders(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES inv_items(id),
  qty_planned REAL NOT NULL,
  qty_actual REAL
);

CREATE TABLE IF NOT EXISTS inv_shipments (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','picked','shipped','cancelled')),
  deal_id TEXT REFERENCES deals(id) ON DELETE SET NULL,
  shipped_at TEXT,
  created_by TEXT NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inv_shipment_lines (
  id TEXT PRIMARY KEY NOT NULL,
  shipment_id TEXT NOT NULL REFERENCES inv_shipments(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES inv_items(id),
  location_id TEXT NOT NULL REFERENCES inv_locations(id),
  qty REAL NOT NULL CHECK (qty > 0)
);

CREATE TABLE IF NOT EXISTS inv_movements (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'RECEIPT','TRANSFER_OUT','TRANSFER_IN','PRODUCTION_ISSUE','PRODUCTION_RECEIPT','ADJUSTMENT','SHIPMENT'
  )),
  item_id TEXT NOT NULL REFERENCES inv_items(id),
  location_id TEXT NOT NULL REFERENCES inv_locations(id),
  qty_delta REAL NOT NULL,
  unit_cost REAL,
  source TEXT CHECK (source IS NULL OR source IN ('import','local_purchase')),
  notes TEXT,
  ref_production_order_id TEXT REFERENCES inv_production_orders(id) ON DELETE SET NULL,
  ref_shipment_id TEXT REFERENCES inv_shipments(id) ON DELETE SET NULL,
  ref_deal_id TEXT REFERENCES deals(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS inv_movements_item_loc_idx ON inv_movements(item_id, location_id);
CREATE INDEX IF NOT EXISTS inv_movements_created_at_idx ON inv_movements(created_at);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS workforce_employees (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  full_name TEXT NOT NULL,
  employee_number TEXT,
  rfid_uid TEXT NOT NULL UNIQUE,
  profile_id TEXT REFERENCES crm_users(id) ON DELETE SET NULL,
  primary_department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  phone TEXT,
  email TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS access_readers (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT NOT NULL,
  reader_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('facility_in','facility_out','department')),
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS access_events (
  id TEXT PRIMARY KEY NOT NULL,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
  workforce_employee_id TEXT NOT NULL REFERENCES workforce_employees(id) ON DELETE CASCADE,
  reader_id TEXT NOT NULL REFERENCES access_readers(id),
  rfid_raw TEXT,
  device_meta TEXT
);

CREATE TABLE IF NOT EXISTS department_time_segments (
  id TEXT PRIMARY KEY NOT NULL,
  workforce_employee_id TEXT NOT NULL REFERENCES workforce_employees(id) ON DELETE CASCADE,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  started_event_id TEXT REFERENCES access_events(id) ON DELETE SET NULL,
  ended_event_id TEXT REFERENCES access_events(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lost_time_incidents (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  workforce_employee_id TEXT NOT NULL REFERENCES workforce_employees(id) ON DELETE CASCADE,
  left_at TEXT NOT NULL,
  returned_at TEXT NOT NULL,
  minutes_lost INTEGER NOT NULL,
  facility_out_event_id TEXT REFERENCES access_events(id) ON DELETE SET NULL,
  facility_in_event_id TEXT REFERENCES access_events(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS access_events_emp_time_idx ON access_events(workforce_employee_id, occurred_at DESC, id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS department_time_segments_one_open_per_employee
  ON department_time_segments(workforce_employee_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS department_time_segments_emp_started_idx ON department_time_segments(workforce_employee_id, started_at DESC);
CREATE INDEX IF NOT EXISTS lost_time_emp_idx ON lost_time_incidents(workforce_employee_id, returned_at DESC);

CREATE TABLE IF NOT EXISTS quote_requests (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  product_key TEXT NOT NULL,
  product_label TEXT NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  quantity REAL,
  uom TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'reviewing', 'quoted', 'accepted', 'declined', 'invoiced', 'paid', 'cancelled'
  )),
  assigned_owner_id TEXT REFERENCES crm_users(id) ON DELETE SET NULL,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id TEXT REFERENCES deals(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  quote_request_id TEXT NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'void')),
  subtotal_zar REAL NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0,
  tax_zar REAL NOT NULL DEFAULT 0,
  total_zar REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  valid_until TEXT,
  created_by TEXT NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  pdf_path TEXT,
  customer_email_snapshot TEXT,
  customer_company_snapshot TEXT,
  customer_contact_snapshot TEXT
);

CREATE TABLE IF NOT EXISTS quote_lines (
  id TEXT PRIMARY KEY NOT NULL,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 1,
  unit_price_zar REAL NOT NULL DEFAULT 0,
  line_total_zar REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void'
  )),
  subtotal_zar REAL NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0,
  tax_zar REAL NOT NULL DEFAULT 0,
  total_zar REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  due_date TEXT,
  created_by TEXT NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  pdf_path TEXT,
  customer_email_snapshot TEXT,
  customer_company_snapshot TEXT,
  customer_contact_snapshot TEXT
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id TEXT PRIMARY KEY NOT NULL,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 1,
  unit_price_zar REAL NOT NULL DEFAULT 0,
  line_total_zar REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS crm_notifications (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  user_id TEXT NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  read_at TEXT
);

CREATE INDEX IF NOT EXISTS quote_requests_status_idx ON quote_requests(status);
CREATE INDEX IF NOT EXISTS quote_requests_created_at_idx ON quote_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS crm_notifications_user_created_idx ON crm_notifications(user_id, created_at DESC);
`;

/** One-time demo rows for offline SQLite (Supabase has migration 0012_standerton_demo_seed.sql). */
function trySeedLocalDemoData(db: Database) {
  const urows = dbAll<{ id: string }>(db, "SELECT id FROM crm_users LIMIT 1");
  if (!urows.length) return;
  const uid = urows[0].id;
  const crow = dbAll<{ n: number }>(db, "SELECT COUNT(*) AS n FROM contacts")[0];
  if ((crow?.n ?? 0) > 0) return;

  const now = new Date().toISOString();
  const c1 = crypto.randomUUID();
  const c2 = crypto.randomUUID();
  const c3 = crypto.randomUUID();
  const d1 = crypto.randomUUID();
  const d2 = crypto.randomUUID();
  const qreq = crypto.randomUUID();
  const qid = crypto.randomUUID();
  const invid = crypto.randomUUID();
  const ship = crypto.randomUUID();
  const po = crypto.randomUUID();
  const dept = crypto.randomUUID();
  const emp = crypto.randomUUID();
  const reader = crypto.randomUUID();

  const yarnRow = dbAll<{ id: string }>(
    db,
    "SELECT id FROM inv_items WHERE sku = 'SM-YRN-N32-CB' LIMIT 1"
  )[0];
  const fabricRow = dbAll<{ id: string }>(
    db,
    "SELECT id FROM inv_items WHERE sku = 'SM-TEX-WOV-480' LIMIT 1"
  )[0];
  const rawRow = dbAll<{ id: string }>(
    db,
    "SELECT id FROM inv_items WHERE sku = 'SM-RM-COT-LINT' LIMIT 1"
  )[0];
  const itYarn = yarnRow?.id ?? dbAll<{ id: string }>(db, "SELECT id FROM inv_items LIMIT 1")[0]?.id;
  if (!itYarn) return;
  const itFabric = fabricRow?.id ?? itYarn;
  const itRaw = rawRow?.id ?? itYarn;

  let locRecv =
    dbAll<{ id: string }>(db, "SELECT id FROM inv_locations ORDER BY sort_order LIMIT 1")[0]?.id ?? null;
  let locWh =
    dbAll<{ id: string }>(db, "SELECT id FROM inv_locations WHERE zone = 'warehouse' LIMIT 1")[0]?.id ?? null;
  let locWip =
    dbAll<{ id: string }>(db, "SELECT id FROM inv_locations WHERE zone = 'wip' LIMIT 1")[0]?.id ?? null;
  if (!locRecv) {
    locRecv = crypto.randomUUID();
    dbRun(db, "INSERT INTO inv_locations (id, created_at, updated_at, name, zone, sort_order) VALUES (?,?,?,?,?,?)", [
      locRecv,
      now,
      now,
      "Demo Receiving",
      "receiving",
      0,
    ]);
  }
  if (!locWh) {
    locWh = crypto.randomUUID();
    dbRun(db, "INSERT INTO inv_locations (id, created_at, updated_at, name, zone, sort_order) VALUES (?,?,?,?,?,?)", [
      locWh,
      now,
      now,
      "Demo Warehouse A",
      "warehouse",
      2,
    ]);
  }
  if (!locWip) {
    locWip = crypto.randomUUID();
    dbRun(db, "INSERT INTO inv_locations (id, created_at, updated_at, name, zone, sort_order) VALUES (?,?,?,?,?,?)", [
      locWip,
      now,
      now,
      "Demo Weaving WIP",
      "wip",
      1,
    ]);
  }

  dbRun(
    db,
    `INSERT INTO contacts (id, created_at, updated_at, company_name, contact_name, email, phone, type, status, owner_id, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      c1,
      now,
      now,
      "Demo: Lindela Weavers (Pty) Ltd",
      "Thandi Mbeki",
      "thandi.mbeki@lindela-demo.example",
      "+27 17 000 1001",
      "customer",
      "active",
      uid,
      "[demo-seed] Offline CRM demo buyer.",
    ]
  );
  dbRun(
    db,
    `INSERT INTO contacts (id, created_at, updated_at, company_name, contact_name, email, phone, type, status, owner_id, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      c2,
      now,
      now,
      "Demo: ChemColour Suppliers",
      "Johan van der Merwe",
      "johan@chemcolour-demo.example",
      "+27 11 000 2002",
      "supplier",
      "active",
      uid,
      "[demo-seed] Chemicals supplier.",
    ]
  );
  dbRun(
    db,
    `INSERT INTO contacts (id, created_at, updated_at, company_name, contact_name, email, phone, type, status, owner_id, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      c3,
      now,
      now,
      "Demo: Ndlovu Mining textiles",
      "Sipho Ndlovu",
      "s.n@ndlovu-demo-mining.example",
      "+27 18 000 3003",
      "lead",
      "qualification",
      uid,
      "[demo-seed] Shade net RFQ.",
    ]
  );

  dbRun(
    db,
    `INSERT INTO deals (id, created_at, updated_at, contact_id, title, stage, value_zar, owner_id, expected_close) VALUES (?,?,?,?,?,?,?,?,?)`,
    [d1, now, now, c1, "Lindela — greige TW-480 annual", "proposal", 1250000, uid, now]
  );
  dbRun(
    db,
    `INSERT INTO deals (id, created_at, updated_at, contact_id, title, stage, value_zar, owner_id, expected_close) VALUES (?,?,?,?,?,?,?,?,?)`,
    [d2, now, now, c3, "Ndlovu — shade net tender", "qualification", 420000, uid, now]
  );

  dbRun(
    db,
    `INSERT INTO activities (id, created_at, contact_id, deal_id, kind, subject, body, occurred_at, created_by) VALUES (?,?,?,?,?,?,?,?,?)`,
    [crypto.randomUUID(), now, c1, d1, "call", "Pricing follow-up", "Discussed MOQ.", now, uid]
  );

  dbRun(
    db,
    `INSERT INTO tasks (id, created_at, updated_at, title, due_at, status, assignee_id, contact_id, deal_id, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [crypto.randomUUID(), now, now, "Send revised quote to Lindela", now, "open", uid, c1, d1, uid]
  );

  dbRun(db, "UPDATE inv_items SET reorder_min = 400, standard_cost = 45, list_price_zar = 89 WHERE id = ?", [itYarn]);
  dbRun(db, "UPDATE inv_items SET reorder_min = 120, standard_cost = 120, list_price_zar = 210 WHERE id = ?", [itFabric]);

  const mov = (id: string, type: string, item: string, loc: string, qty: number, note: string) =>
    dbRun(db, `INSERT INTO inv_movements (id, created_at, movement_type, item_id, location_id, qty_delta, notes, created_by) VALUES (?,?,?,?,?,?,?,?)`, [
      id,
      now,
      type,
      item,
      loc,
      qty,
      note,
      uid,
    ]);
  mov(crypto.randomUUID(), "RECEIPT", itRaw, locRecv, 5000, "[demo-seed] Raw cotton received");
  mov(crypto.randomUUID(), "TRANSFER_IN", itYarn, locWh, 2200, "[demo-seed] Yarn to warehouse");
  mov(crypto.randomUUID(), "TRANSFER_IN", itFabric, locWh, 85, "[demo-seed] Greige rolls");

  dbRun(
    db,
    `INSERT INTO quote_requests (id, created_at, updated_at, product_key, product_label, company_name, contact_name, email, phone, message, quantity, uom, status, assigned_owner_id, contact_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      qreq,
      now,
      now,
      "SM-TEX-WOV-480",
      "Technical woven 480 g/m²",
      "Lindela Weavers (Demo)",
      "Thandi Mbeki",
      "thandi.mbeki@lindela-demo.example",
      "+27 17 000 1001",
      "Need quote for 2500 m per month.",
      2500,
      "m",
      "reviewing",
      uid,
      c1,
    ]
  );

  dbRun(
    db,
    `INSERT INTO quotes (id, created_at, updated_at, quote_request_id, quote_number, status, subtotal_zar, tax_rate, tax_zar, total_zar, currency, valid_until, created_by, customer_email_snapshot, customer_company_snapshot, customer_contact_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      qid,
      now,
      now,
      qreq,
      "DEMO-QT-LOCAL",
      "sent",
      380000,
      0.15,
      57000,
      437000,
      "ZAR",
      now,
      uid,
      "thandi.mbeki@lindela-demo.example",
      "Lindela Weavers (Demo)",
      "Thandi Mbeki",
    ]
  );
  dbRun(
    db,
    `INSERT INTO quote_lines (id, quote_id, position, description, qty, unit_price_zar, line_total_zar) VALUES (?,?,?,?,?,?,?)`,
    [crypto.randomUUID(), qid, 0, "SM-TEX-WOV-480 monthly", 2500, 120, 300000]
  );
  dbRun(
    db,
    `INSERT INTO quote_lines (id, quote_id, position, description, qty, unit_price_zar, line_total_zar) VALUES (?,?,?,?,?,?,?)`,
    [crypto.randomUUID(), qid, 1, "Delivery", 1, 80000, 80000]
  );

  dbRun(
    db,
    `INSERT INTO invoices (id, created_at, updated_at, quote_id, invoice_number, status, subtotal_zar, tax_rate, tax_zar, total_zar, currency, due_date, created_by, customer_email_snapshot, customer_company_snapshot, customer_contact_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      invid,
      now,
      now,
      qid,
      "DEMO-INV-LOCAL",
      "sent",
      380000,
      0.15,
      57000,
      437000,
      "ZAR",
      now,
      uid,
      "thandi.mbeki@lindela-demo.example",
      "Lindela Weavers (Demo)",
      "Thandi Mbeki",
    ]
  );
  dbRun(
    db,
    `INSERT INTO invoice_lines (id, invoice_id, position, description, qty, unit_price_zar, line_total_zar) VALUES (?,?,?,?,?,?,?)`,
    [crypto.randomUUID(), invid, 0, "Per quote DEMO-QT-LOCAL", 1, 380000, 380000]
  );

  dbRun(
    db,
    `INSERT INTO inv_shipments (id, created_at, updated_at, status, deal_id, created_by) VALUES (?,?,?,?,?,?)`,
    [ship, now, now, "picked", d1, uid]
  );
  dbRun(
    db,
    `INSERT INTO inv_shipment_lines (id, shipment_id, item_id, location_id, qty) VALUES (?,?,?,?,?)`,
    [crypto.randomUUID(), ship, itYarn, locWh, 120]
  );
  dbRun(
    db,
    `INSERT INTO inv_movements (id, created_at, movement_type, item_id, location_id, qty_delta, ref_shipment_id, created_by) VALUES (?,?,?,?,?,?,?,?)`,
    [crypto.randomUUID(), now, "SHIPMENT", itYarn, locWh, -120, ship, uid]
  );

  dbRun(
    db,
    `INSERT INTO crm_notifications (id, created_at, user_id, kind, payload) VALUES (?,?,?,?,?)`,
    [crypto.randomUUID(), now, uid, "quote_sent", '{"quote_number":"DEMO-QT-LOCAL","demo":true}']
  );

  dbRun(
    db,
    `INSERT INTO departments (id, created_at, updated_at, name, code, sort_order, active) VALUES (?,?,?,?,?,?,1)`,
    [dept, now, now, "Spinning & twisting", "DEMO-SPIN", 10]
  );
  dbRun(
    db,
    `INSERT INTO workforce_employees (id, created_at, updated_at, full_name, employee_number, rfid_uid, primary_department_id, phone, active) VALUES (?,?,?,?,?,?,?,?,1)`,
    [emp, now, now, "Demo: Precious Khumalo", "EMP-DEMO-LOCAL", "LOCAL-RFID-0001", dept, "+27 82 000 4400"]
  );
  dbRun(
    db,
    `INSERT INTO access_readers (id, created_at, name, reader_key, kind) VALUES (?,?,?,?,?)`,
    [reader, now, "Demo Main Gate In", "DEMO-GATE-LOCAL", "facility_in"]
  );
  dbRun(
    db,
    `INSERT INTO access_events (id, occurred_at, workforce_employee_id, reader_id, rfid_raw, device_meta) VALUES (?,?,?,?,?,?)`,
    [crypto.randomUUID(), now, emp, reader, "tap1", "{}"]
  );

  dbRun(
    db,
    `INSERT INTO inv_production_orders (id, created_at, updated_at, status, notes, issue_location_id, receipt_location_id, released_at, created_by) VALUES (?,?,?,?,?,?,?,?,?)`,
    [po, now, now, "released", "[demo-seed] Issue yarn for weaving", locWh, locWip, now, uid]
  );
  dbRun(
    db,
    `INSERT INTO inv_production_lines_in (id, production_order_id, item_id, qty_planned, qty_actual) VALUES (?,?,?,?,?)`,
    [crypto.randomUUID(), po, itYarn, 500, 500]
  );
  dbRun(
    db,
    `INSERT INTO inv_production_lines_out (id, production_order_id, item_id, qty_planned, qty_actual) VALUES (?,?,?,?,?)`,
    [crypto.randomUUID(), po, itFabric, 40, null]
  );
}

export async function getLocalSqliteDb(): Promise<Database> {
  if (dbInstance) {
    trySeedLocalDemoData(dbInstance);
    return dbInstance;
  }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!sqlModule) {
      sqlModule = await initSqlJs({ locateFile: () => sqlWasmUrl });
    }
    const saved = await idbGet();
    const db = saved ? new sqlModule.Database(saved) : new sqlModule.Database();
    db.exec(SCHEMA);
    try {
      db.run("ALTER TABLE inv_items ADD COLUMN category TEXT NOT NULL DEFAULT 'Mill & yarn'");
    } catch {
      /* column exists */
    }
    try {
      db.run("ALTER TABLE inv_items ADD COLUMN description TEXT");
    } catch {
      /* column exists */
    }
    try {
      db.run("ALTER TABLE inv_items ADD COLUMN list_price_zar REAL NOT NULL DEFAULT 0");
    } catch {
      /* column exists */
    }
    try {
      db.run("ALTER TABLE inv_items ADD COLUMN reorder_min REAL NOT NULL DEFAULT 0");
    } catch {
      /* column exists */
    }
    const now = new Date().toISOString();
    for (const p of ALL_INV_ITEM_SEEDS) {
      db.run(
        `INSERT OR IGNORE INTO inv_items (id, created_at, updated_at, sku, name, kind, uom, standard_cost, list_price_zar, is_active, category, description) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          now,
          now,
          p.sku,
          p.name,
          p.kind,
          p.uom,
          p.standard_cost,
          p.list_price_zar,
          1,
          p.category,
          p.description,
        ]
      );
    }
    for (const p of ALL_INV_ITEM_SEEDS) {
      db.run(
        `UPDATE inv_items SET standard_cost = ?, list_price_zar = ?, updated_at = ? WHERE sku = ?`,
        [p.standard_cost, p.list_price_zar, now, p.sku]
      );
    }
    trySeedLocalDemoData(db);
    schedulePersist();
    dbInstance = db;
    return db;
  })();

  return initPromise;
}

export function notifyLocalDbWrite() {
  schedulePersist();
}

/** Run SELECT and return objects keyed by column names. */
export function dbAll<T extends Record<string, SqlValue>>(
  db: Database,
  sql: string,
  params: SqlValue[] = []
): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function dbRun(db: Database, sql: string, params: SqlValue[] = []) {
  db.run(sql, params);
  notifyLocalDbWrite();
}

export async function resetLocalCrmDatabase() {
  dbInstance?.close();
  dbInstance = null;
  initPromise = null;
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase(IDB_NAME);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}
