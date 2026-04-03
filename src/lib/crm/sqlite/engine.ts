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
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('manager','employee','staff')),
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

export async function getLocalSqliteDb(): Promise<Database> {
  if (dbInstance) return dbInstance;
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
    const now = new Date().toISOString();
    for (const p of ALL_INV_ITEM_SEEDS) {
      db.run(
        `INSERT OR IGNORE INTO inv_items (id, created_at, updated_at, sku, name, kind, uom, standard_cost, is_active, category, description) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          now,
          now,
          p.sku,
          p.name,
          p.kind,
          p.uom,
          p.standard_cost,
          1,
          p.category,
          p.description,
        ]
      );
    }
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
