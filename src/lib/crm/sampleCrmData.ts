/**
 * Optional demo dataset for CRM + inventory. Tagged in contact notes so we can detect idempotent load.
 */
import { getSupabase } from "../supabaseClient";
import { submitPublicQuoteRequest } from "../submitPublicQuoteRequest";
import {
  crmUsesSupabase,
  insertActivity,
  insertTask,
  saveContact,
  saveDeal,
  type CrmActor,
} from "./crmRepo";
import {
  invCompleteProductionOrder,
  invCreateProductionOrder,
  invCreateShipment,
  invGetProductionOrder,
  invListItems,
  invListLocations,
  invListProductionOrders,
  invListShipments,
  invListStockBalances,
  invPostReceipt,
  invPostTransfer,
  invReleaseProductionOrder,
  invSaveLocation,
  invUpdatePOLineActuals,
} from "./inventoryRepo";
import {
  createInvoiceFromQuote,
  createQuoteWithLines,
  listQuoteRequests,
  listQuotesForRequest,
  quotesDataAvailable,
  updateInvoiceHeader,
  updateQuoteHeader,
  updateQuoteRequest,
} from "./quotesRepo";
import { dbAll, getLocalSqliteDb } from "./sqlite/engine";
import {
  upsertDepartment,
  upsertReader,
  upsertWorkforceEmployee,
  workforceIngestScan,
} from "./workforceRepo";

export const SAMPLE_DATA_MARKER = "[Standerton CRM sample]";

function tagNote(text: string): string {
  return `${text}\n\n${SAMPLE_DATA_MARKER}`;
}

export async function sampleCrmDataInstalled(): Promise<boolean> {
  const pattern = `%${SAMPLE_DATA_MARKER}%`;
  if (crmUsesSupabase()) {
    const { data, error } = await getSupabase().from("contacts").select("id").ilike("notes", pattern).limit(1);
    if (error) return false;
    return (data?.length ?? 0) > 0;
  }
  const db = await getLocalSqliteDb();
  const rows = dbAll<{ x: number }>(db, "SELECT 1 AS x FROM contacts WHERE notes LIKE ? LIMIT 1", [pattern]);
  return rows.length > 0;
}

export type InstallSampleResult = {
  ok: boolean;
  message: string;
  error?: Error;
};

const DEMO_READER_GATE_IN = "standerton-demo-gate-in";
const DEMO_READER_GATE_OUT = "standerton-demo-gate-out";
const DEMO_READER_SPIN = "standerton-demo-dept-spin";
const DEMO_READER_WEAVE = "standerton-demo-dept-weave";
const DEMO_READER_FIN = "standerton-demo-dept-fin";
const DEMO_READER_WH = "standerton-demo-dept-wh";

/** Stable IDs so “Load again” upserts instead of duplicating codes / RFID. */
const DEMO_DEPT_SPIN = "a1000000-0000-4000-8000-000000000001";
const DEMO_DEPT_WEAVE = "a1000000-0000-4000-8000-000000000002";
const DEMO_DEPT_FIN = "a1000000-0000-4000-8000-000000000003";
const DEMO_DEPT_WH = "a1000000-0000-4000-8000-000000000004";
const DEMO_READER_GATE_IN_ID = "a2000000-0000-4000-8000-000000000001";
const DEMO_READER_GATE_OUT_ID = "a2000000-0000-4000-8000-000000000002";
const DEMO_READER_SPIN_ID = "a2000000-0000-4000-8000-000000000003";
const DEMO_READER_WEAVE_ID = "a2000000-0000-4000-8000-000000000004";
const DEMO_READER_FIN_ID = "a2000000-0000-4000-8000-000000000005";
const DEMO_READER_WH_ID = "a2000000-0000-4000-8000-000000000006";
const DEMO_EMP_1_ID = "a3000000-0000-4000-8000-000000000001";
const DEMO_EMP_2_ID = "a3000000-0000-4000-8000-000000000002";
const DEMO_EMP_3_ID = "a3000000-0000-4000-8000-000000000003";
const DEMO_EMP_4_ID = "a3000000-0000-4000-8000-000000000004";
const DEMO_EMP_5_ID = "a3000000-0000-4000-8000-000000000005";
const DEMO_EMP_6_ID = "a3000000-0000-4000-8000-000000000006";

const PO_NOTE_COMPLETE = `${SAMPLE_DATA_MARKER} [demo-po] Staple-to-greige conversion`;
const PO_NOTE_DRAFT = `${SAMPLE_DATA_MARKER} [demo-po] Draft: carded sliver → yarn`;
const PO_NOTE_RELEASED = `${SAMPLE_DATA_MARKER} [demo-po] Released: roving+yarn → greige (open)`;

function atDayOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** Avoid stacking thousands of duplicate scans when “Load again” is used repeatedly. */
async function countSampleWorkforceScanEvents(): Promise<number> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data: emps, error: e1 } = await supabase
      .from("workforce_employees")
      .select("id")
      .ilike("employee_number", "%SAMPLE-WF%");
    if (e1) return 0;
    const ids = (emps ?? []).map((r: { id: string }) => r.id);
    if (ids.length === 0) return 0;
    const { count, error: e2 } = await supabase
      .from("access_events")
      .select("id", { count: "exact", head: true })
      .in("workforce_employee_id", ids);
    if (e2) return 0;
    return count ?? 0;
  }
  const db = await getLocalSqliteDb();
  const row = dbAll<{ c: number }>(
    db,
    `SELECT COUNT(*) AS c FROM access_events ae
     INNER JOIN workforce_employees we ON we.id = ae.workforce_employee_id
     WHERE we.employee_number LIKE 'SAMPLE-WF-%'`
  )[0];
  return row?.c ?? 0;
}

async function productionOrderExists(needle: string): Promise<boolean> {
  const pos = await invListProductionOrders();
  return pos.some((p) => (p.notes ?? "").includes(needle));
}

type ContactSeedRow = {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
};

async function pickQuoteRequest(id: string) {
  const rows = await listQuoteRequests();
  return rows.find((r) => r.id === id) ?? null;
}

/** Quote + invoice demo: uses public submit path (Edge on Supabase, SQLite insert locally). */
async function seedQuotePipeline(
  actor: CrmActor,
  ownerId: string,
  apex: string,
  agri: string,
  logistics: string,
  hygiene: string,
  dealApex: string,
  dealAgri: string,
  dealLog: string,
  dealClean: string,
  contactDefs: ContactSeedRow[],
  addDays: (n: number) => string
): Promise<string> {
  const sub1 = await submitPublicQuoteRequest({
    product_key: "conveyor-belt-fabrics",
    product_label: "Conveyor Belt Fabrics",
    company_name: contactDefs[0].company_name,
    contact_name: contactDefs[0].contact_name,
    email: contactDefs[0].email,
    phone: contactDefs[0].phone,
    message: `${SAMPLE_DATA_MARKER} RFQ belt width 1200 mm`,
    quantity: 120,
    uom: "m",
  });
  if (!sub1.ok) throw new Error(sub1.error);

  const sub2 = await submitPublicQuoteRequest({
    product_key: "mob-head-fabrics",
    product_label: "Mob Head Fabrics",
    company_name: contactDefs[1].company_name,
    contact_name: contactDefs[1].contact_name,
    email: contactDefs[1].email,
    phone: contactDefs[1].phone,
    message: `${SAMPLE_DATA_MARKER} Shade house extension`,
    quantity: 18,
    uom: "roll",
  });
  if (!sub2.ok) throw new Error(sub2.error);

  const sub3 = await submitPublicQuoteRequest({
    product_key: "technical-fabrics",
    product_label: "Technical Fabrics",
    company_name: contactDefs[2].company_name,
    contact_name: contactDefs[2].contact_name,
    email: contactDefs[2].email,
    phone: contactDefs[2].phone,
    message: `${SAMPLE_DATA_MARKER} Pilot lane evaluation`,
    quantity: 500,
    uom: "m",
  });
  if (!sub3.ok) throw new Error(sub3.error);

  const sub4 = await submitPublicQuoteRequest({
    product_key: "woven-industrial-fabrics",
    product_label: "Woven Industrial Fabrics",
    company_name: contactDefs[3].company_name,
    contact_name: contactDefs[3].contact_name,
    email: contactDefs[3].email,
    phone: contactDefs[3].phone,
    message: `${SAMPLE_DATA_MARKER} Opening order — cleaning line`,
    quantity: 64,
    uom: "unit",
  });
  if (!sub4.ok) throw new Error(sub4.error);

  const ridApex = sub1.request_id;
  const ridAgri = sub2.request_id;
  const ridLog = sub3.request_id;
  const ridHygiene = sub4.request_id;

  await updateQuoteRequest(ridApex, { assigned_owner_id: ownerId, contact_id: apex, deal_id: dealApex });
  let qr = await pickQuoteRequest(ridApex);
  if (!qr) throw new Error("Missing quote request");
  let qid = await createQuoteWithLines(actor.id, qr, {
    valid_until: addDays(21),
    tax_rate: 0.15,
    lines: [
      { description: "Industrial woven belt fabric, 850 g/m² — supply & treat", qty: 80, unit_price_zar: 285 },
      { description: "Edge sealing & join kits (estimated)", qty: 4, unit_price_zar: 1200 },
    ],
  });
  await updateQuoteHeader(qid, { status: "sent" });
  await updateQuoteRequest(ridApex, { status: "quoted" });

  await updateQuoteRequest(ridAgri, { assigned_owner_id: ownerId, contact_id: agri, deal_id: dealAgri });
  qr = await pickQuoteRequest(ridAgri);
  if (!qr) throw new Error("Missing quote request");
  await createQuoteWithLines(actor.id, qr, {
    valid_until: addDays(30),
    tax_rate: 0.15,
    lines: [{ description: "Agricultural shade cloth, 70% — per m²", qty: 2200, unit_price_zar: 18.5 }],
  });

  await updateQuoteRequest(ridLog, { assigned_owner_id: ownerId, contact_id: logistics, deal_id: dealLog });

  await updateQuoteRequest(ridHygiene, { assigned_owner_id: ownerId, contact_id: hygiene, deal_id: dealClean });
  qr = await pickQuoteRequest(ridHygiene);
  if (!qr) throw new Error("Missing quote request");
  qid = await createQuoteWithLines(actor.id, qr, {
    valid_until: addDays(14),
    tax_rate: 0.15,
    lines: [
      { description: "All-purpose cleaner — 5 L x units", qty: 40, unit_price_zar: 185 },
      { description: "Industrial degreaser — 5 L x units", qty: 24, unit_price_zar: 210 },
    ],
  });
  await updateQuoteHeader(qid, { status: "accepted" });
  await updateQuoteRequest(ridHygiene, { status: "accepted" });
  const quotes = await listQuotesForRequest(ridHygiene);
  const quoteRow = quotes.find((q) => q.id === qid);
  if (!quoteRow) throw new Error("Missing quote row");
  const qrInv = await pickQuoteRequest(ridHygiene);
  if (!qrInv) throw new Error("Missing quote request");
  const invId = await createInvoiceFromQuote(actor.id, quoteRow, qrInv, {
    due_date: addDays(14),
    tax_rate: 0.15,
    lines: [
      { description: "All-purpose cleaner — 5 L x units", qty: 40, unit_price_zar: 185 },
      { description: "Industrial degreaser — 5 L x units", qty: 24, unit_price_zar: 210 },
    ],
  });
  await updateInvoiceHeader(invId, { status: "sent" });
  await updateQuoteRequest(ridHygiene, { status: "invoiced" });

  return "Quotes: 4 web requests, 3 quotes (1 sent, 1 draft, 1 accepted + invoice).";
}

async function seedWorkforceDemo(actor: CrmActor, force: boolean): Promise<string | null> {
  void actor;
  await upsertDepartment({
    id: DEMO_DEPT_SPIN,
    name: "Spinning",
    code: "SPIN-DEMO",
    sort_order: 10,
  });
  const weaveId = await upsertDepartment({
    id: DEMO_DEPT_WEAVE,
    name: "Weaving",
    code: "WEAV-DEMO",
    sort_order: 11,
  });
  const finId = await upsertDepartment({
    id: DEMO_DEPT_FIN,
    name: "Finishing",
    code: "FIN-DEMO",
    sort_order: 12,
  });
  const whIdDept = await upsertDepartment({
    id: DEMO_DEPT_WH,
    name: "Warehouse & dispatch",
    code: "WH-DEMO",
    sort_order: 13,
  });
  const spinId = DEMO_DEPT_SPIN;

  await upsertReader({
    id: DEMO_READER_GATE_IN_ID,
    name: "Demo gate (in)",
    reader_key: DEMO_READER_GATE_IN,
    kind: "facility_in",
  });
  await upsertReader({
    id: DEMO_READER_GATE_OUT_ID,
    name: "Demo gate (out)",
    reader_key: DEMO_READER_GATE_OUT,
    kind: "facility_out",
  });
  await upsertReader({
    id: DEMO_READER_SPIN_ID,
    name: "Demo Spin dept reader",
    reader_key: DEMO_READER_SPIN,
    kind: "department",
    department_id: spinId,
  });
  await upsertReader({
    id: DEMO_READER_WEAVE_ID,
    name: "Demo Weave dept reader",
    reader_key: DEMO_READER_WEAVE,
    kind: "department",
    department_id: weaveId,
  });
  await upsertReader({
    id: DEMO_READER_FIN_ID,
    name: "Demo Finishing dept reader",
    reader_key: DEMO_READER_FIN,
    kind: "department",
    department_id: finId,
  });
  await upsertReader({
    id: DEMO_READER_WH_ID,
    name: "Demo warehouse clock reader",
    reader_key: DEMO_READER_WH,
    kind: "department",
    department_id: whIdDept,
  });

  await upsertWorkforceEmployee({
    id: DEMO_EMP_1_ID,
    full_name: "Zanele Mkhatshwa",
    rfid_uid: "DEMO-RFID-001",
    employee_number: "SAMPLE-WF-001",
    primary_department_id: spinId,
    phone: "+27 17 555 9001",
    email: "z.mkhatshwa.sample@standerton.local",
  });
  await upsertWorkforceEmployee({
    id: DEMO_EMP_2_ID,
    full_name: "Johan de Wet",
    rfid_uid: "DEMO-RFID-002",
    employee_number: "SAMPLE-WF-002",
    primary_department_id: weaveId,
    phone: "+27 17 555 9002",
    email: "j.dewet.sample@standerton.local",
  });
  await upsertWorkforceEmployee({
    id: DEMO_EMP_3_ID,
    full_name: "Precious Nkosi",
    rfid_uid: "DEMO-RFID-003",
    employee_number: "SAMPLE-WF-003",
    primary_department_id: finId,
    phone: "+27 17 555 9003",
    email: "p.nkosi.sample@standerton.local",
  });
  await upsertWorkforceEmployee({
    id: DEMO_EMP_4_ID,
    full_name: "André Venter",
    rfid_uid: "DEMO-RFID-004",
    employee_number: "SAMPLE-WF-004",
    primary_department_id: spinId,
    phone: "+27 17 555 9004",
    email: "a.venter.sample@standerton.local",
  });
  await upsertWorkforceEmployee({
    id: DEMO_EMP_5_ID,
    full_name: "Nomsa Mthembu",
    rfid_uid: "DEMO-RFID-005",
    employee_number: "SAMPLE-WF-005",
    primary_department_id: weaveId,
    phone: "+27 17 555 9005",
    email: "n.mthembu.sample@standerton.local",
  });
  await upsertWorkforceEmployee({
    id: DEMO_EMP_6_ID,
    full_name: "Willem Kruger",
    rfid_uid: "DEMO-RFID-006",
    employee_number: "SAMPLE-WF-006",
    primary_department_id: whIdDept,
    phone: "+27 17 555 9006",
    email: "w.kruger.sample@standerton.local",
  });

  const scanCount = await countSampleWorkforceScanEvents();
  if (!force && scanCount > 120) {
    return "Workforce: roster refreshed (6 employees, 4 dept readers, gates); skipped replaying scans (already dense).";
  }

  type Ev = { ts: string; readerKey: string; rfid: string };
  const ev: Ev[] = [];
  const R = {
    in: DEMO_READER_GATE_IN,
    out: DEMO_READER_GATE_OUT,
    spin: DEMO_READER_SPIN,
    weave: DEMO_READER_WEAVE,
    fin: DEMO_READER_FIN,
    wh: DEMO_READER_WH,
  };
  const add = (day: number, h: number, m: number, readerKey: string, rfid: string) => {
    ev.push({ ts: atDayOffset(day, h, m), readerKey, rfid });
  };

  /* Two days ago — full multi-department “shifts” */
  add(-2, 6, 0, R.in, "demo-rfid-001");
  add(-2, 6, 20, R.spin, "demo-rfid-001");
  add(-2, 9, 0, R.weave, "demo-rfid-001");
  add(-2, 11, 30, R.fin, "demo-rfid-001");
  add(-2, 15, 0, R.out, "demo-rfid-001");

  add(-2, 6, 30, R.in, "demo-rfid-002");
  add(-2, 7, 0, R.weave, "demo-rfid-002");
  add(-2, 10, 15, R.wh, "demo-rfid-002");
  add(-2, 14, 30, R.out, "demo-rfid-002");

  add(-2, 7, 0, R.in, "demo-rfid-003");
  add(-2, 7, 25, R.fin, "demo-rfid-003");
  add(-2, 10, 0, R.spin, "demo-rfid-003");
  add(-2, 16, 0, R.out, "demo-rfid-003");

  /* Yesterday */
  add(-1, 6, 0, R.in, "demo-rfid-002");
  add(-1, 6, 35, R.weave, "demo-rfid-002");
  add(-1, 13, 0, R.out, "demo-rfid-002");

  add(-1, 6, 15, R.in, "demo-rfid-004");
  add(-1, 6, 45, R.spin, "demo-rfid-004");
  add(-1, 12, 0, R.weave, "demo-rfid-004");
  add(-1, 14, 0, R.fin, "demo-rfid-004");
  add(-1, 16, 30, R.out, "demo-rfid-004");

  add(-1, 8, 0, R.in, "demo-rfid-006");
  add(-1, 8, 30, R.wh, "demo-rfid-006");
  add(-1, 11, 30, R.out, "demo-rfid-006");

  /* Today — overlap + long lunch (lost-time) */
  add(0, 5, 45, R.in, "demo-rfid-001");
  add(0, 6, 5, R.spin, "demo-rfid-001");
  add(0, 14, 0, R.out, "demo-rfid-001");

  add(0, 6, 0, R.in, "demo-rfid-005");
  add(0, 6, 30, R.weave, "demo-rfid-005");
  add(0, 12, 0, R.out, "demo-rfid-005");
  add(0, 12, 42, R.in, "demo-rfid-005");
  add(0, 12, 50, R.weave, "demo-rfid-005");
  add(0, 15, 30, R.out, "demo-rfid-005");

  add(0, 7, 0, R.in, "demo-rfid-006");
  add(0, 7, 25, R.fin, "demo-rfid-006");
  add(0, 12, 0, R.spin, "demo-rfid-006");
  add(0, 15, 0, R.out, "demo-rfid-006");

  ev.sort((a, b) => a.ts.localeCompare(b.ts));
  for (const e of ev) {
    await workforceIngestScan(e.readerKey, e.rfid, { clientTs: e.ts });
  }

  return `Workforce: 4 departments, 6 readers, 6 employees; ${ev.length} clocking events over recent days (dept time segments + gate/lost-time).`;
}

async function seedProductionAndShipment(actor: CrmActor, dealAgri: string, force: boolean): Promise<string | null> {
  const locs = await invListLocations();
  const receivingId = locs.find((l) => l.zone === "receiving")?.id ?? locs[0]?.id ?? null;
  const wipId = locs.find((l) => l.zone === "wip")?.id ?? null;
  const whId = locs.find((l) => l.zone === "warehouse")?.id ?? null;
  if (!receivingId || !wipId) return null;

  const items = await invListItems(true);
  const bySku = new Map(items.map((i) => [i.sku, i.id]));
  const rawPetId = bySku.get("SM-RM-PET-FIB");
  const finishedGreigeId = bySku.get("SM-TEX-WOV-480");
  const sliverId = bySku.get("SM-WIP-SLIVER");
  const yarnId = bySku.get("SM-YRN-N32-CB");
  const rovingId = bySku.get("SM-WIP-ROV");
  const greigeLightId = bySku.get("SM-WOV-GREIGE-220");
  if (!rawPetId || !finishedGreigeId) return null;

  const parts: string[] = [];

  const needComplete =
    force ||
    (!(await productionOrderExists("[demo-po] Staple-to-greige")) &&
      !(await productionOrderExists("Demo staple-to-greige conversion")));
  if (needComplete) {
    const { id: poId, error: poErr } = await invCreateProductionOrder(actor, {
      issue_location_id: receivingId,
      receipt_location_id: wipId,
      notes: PO_NOTE_COMPLETE,
      linesIn: [{ item_id: rawPetId, qty_planned: 120 }],
      linesOut: [{ item_id: finishedGreigeId, qty_planned: 2 }],
    });
    if (poErr || !poId) {
      parts.push(`PO complete: ${poErr?.message ?? "could not create"}.`);
    } else {
      await invReleaseProductionOrder(poId, actor);
      const bundle = await invGetProductionOrder(poId);
      if (bundle) {
        await invUpdatePOLineActuals(
          bundle.linesIn.map((l) => ({ id: l.id, qty_actual: l.qty_planned })),
          bundle.linesOut.map((l) => ({ id: l.id, qty_actual: l.qty_planned })),
          actor
        );
        const { error: compErr } = await invCompleteProductionOrder(poId, actor);
        parts.push(
          compErr ? `Completed PO failed: ${compErr.message}.` : "1× completed PO (staple → greige)."
        );
      }
    }
  }

  if (sliverId && yarnId && (force || !(await productionOrderExists("[demo-po] Draft:")))) {
    const { id: draftId, error: dErr } = await invCreateProductionOrder(actor, {
      issue_location_id: receivingId,
      receipt_location_id: wipId,
      notes: PO_NOTE_DRAFT,
      linesIn: [{ item_id: sliverId, qty_planned: 350 }],
      linesOut: [{ item_id: yarnId, qty_planned: 10 }],
    });
    parts.push(dErr || !draftId ? `PO draft: ${dErr?.message ?? "failed"}.` : "1× draft PO (sliver → yarn).");
  }

  if (yarnId && rovingId && greigeLightId && (force || !(await productionOrderExists("[demo-po] Released:")))) {
    const { id: relId, error: rErr } = await invCreateProductionOrder(actor, {
      issue_location_id: receivingId,
      receipt_location_id: wipId,
      notes: PO_NOTE_RELEASED,
      linesIn: [
        { item_id: yarnId, qty_planned: 20 },
        { item_id: rovingId, qty_planned: 80 },
      ],
      linesOut: [{ item_id: greigeLightId, qty_planned: 4 }],
    });
    if (!rErr && relId) {
      await invReleaseProductionOrder(relId, actor);
      parts.push("1× released PO (yarn+roving → greige, left open).");
    } else {
      parts.push(`PO released-demo: ${rErr?.message ?? "failed"}.`);
    }
  }

  if (whId) {
    const ships = await invListShipments();
    const hasDraft = ships.some((s) => s.deal_id === dealAgri && s.status === "draft");
    if (!force && hasDraft) {
      /* skip */
    } else {
      const bals = await invListStockBalances();
      const fgId = finishedId;
      let pick = bals.find((b) => b.location_id === whId && b.qty >= 5);
      if (!pick && fgId) {
        const recvBal = bals.find((b) => b.location_id === receivingId && b.item_id === fgId && b.qty >= 5);
        if (recvBal) {
          const moveQty = Math.min(24, Math.floor(Number(recvBal.qty)));
          const { error: trErr } = await invPostTransfer(actor, {
            item_id: fgId,
            from_location_id: receivingId,
            to_location_id: whId,
            qty: moveQty,
            notes: `${SAMPLE_DATA_MARKER} Staging for demo shipment`,
          });
          if (trErr) parts.push(`Transfer: ${trErr.message}.`);
          const bals2 = await invListStockBalances();
          pick = bals2.find((b) => b.location_id === whId && b.item_id === fgId && b.qty >= 5);
        }
      }
      if (pick) {
        const shipQty = Math.min(5, Math.floor(Number(pick.qty)));
        const { error: sErr } = await invCreateShipment(actor, dealAgri, [
          { item_id: pick.item_id, location_id: whId!, qty: shipQty },
        ]);
        parts.push(sErr ? `Shipment: ${sErr.message}.` : "Draft shipment linked to Lowveld Agri deal.");
      }
    }
  }

  return parts.length ? parts.join(" ") : null;
}

/**
 * Inserts contacts, deals, activities, tasks; quotes/invoice; workforce roster + multi-day RFID clockings (time segments);
 * inventory + production (completed, draft, released-open POs) + draft shipment when possible.
 * Skips if sample marker already present unless `force` is true (may duplicate rows, scans, orders, etc.).
 */
export async function installSampleCrmData(
  actor: CrmActor,
  options?: { force?: boolean }
): Promise<InstallSampleResult> {
  if (actor.role === "staff") {
    return {
      ok: false,
      message: "Sample data can only be loaded by a manager or employee.",
      error: new Error("Staff role cannot install sample deals and inventory."),
    };
  }

  if (!options?.force && (await sampleCrmDataInstalled())) {
    return {
      ok: false,
      message: "Sample data is already loaded. Open Contacts and search notes for the sample tag, or check “Load again” in Settings.",
    };
  }

  const ownerId = actor.id;
  const iso = (d: Date) => d.toISOString();
  const day = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return iso(d);
  };
  const close = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  type CDef = {
    company_name: string;
    contact_name: string;
    email: string;
    phone: string;
    type: "lead" | "customer" | "supplier";
    notes: string;
  };

  const contactDefs: CDef[] = [
    {
      company_name: "Apex Mining (Pty) Ltd",
      contact_name: "Thabo Molefe",
      email: "procurement@apex-mining.sample",
      phone: "+27 11 555 0101",
      type: "customer",
      notes: tagNote("Conveyor belt fabric renewal; site visits in Mpumalanga."),
    },
    {
      company_name: "Lowveld Agri Co-operative",
      contact_name: "Sarah van der Merwe",
      email: "buyer@lowveld-agri.sample",
      phone: "+27 13 555 0202",
      type: "customer",
      notes: tagNote("Shade cloth and protective covers for packhouse expansion."),
    },
    {
      company_name: "Gauteng Logistics Hub",
      contact_name: "David Naidoo",
      email: "operations@glh-logistics.sample",
      phone: "+27 10 555 0303",
      type: "lead",
      notes: tagNote("Evaluating heavy-duty fabrics for warehouse conveyors."),
    },
    {
      company_name: "Standerton Hygiene Supplies",
      contact_name: "Lindiwe Dlamini",
      email: "orders@stn-hygiene.sample",
      phone: "+27 17 555 0404",
      type: "customer",
      notes: tagNote("Cleaning products distributor — trial pallet of degreaser and APC."),
    },
    {
      company_name: "FibreMax Raw Materials",
      contact_name: "Chris Pretorius",
      email: "sales@fibremax.sample",
      phone: "+27 12 555 0505",
      type: "supplier",
      notes: tagNote("Polyester staple — quarterly contract discussion."),
    },
    {
      company_name: "East Rand Scaffold & Safety",
      contact_name: "Mike O'Brien",
      email: "quotes@erscaffold.sample",
      phone: "+27 11 555 0606",
      type: "lead",
      notes: tagNote("RFQ for scaffolding nets and barrier fabric."),
    },
  ];

  const contactIds: string[] = [];
  for (const c of contactDefs) {
    const { error, id } = await saveContact(
      {
        company_name: c.company_name,
        contact_name: c.contact_name,
        email: c.email,
        phone: c.phone,
        type: c.type,
        status: "active",
        owner_id: ownerId,
        notes: c.notes,
      },
      actor
    );
    if (error) return { ok: false, message: error.message, error };
    if (!id) return { ok: false, message: "Contact save did not return id.", error: new Error("missing id") };
    contactIds.push(id);
  }

  const [apex, agri, logistics, hygiene, _fibre, scaffold] = contactIds;

  const deals: {
    contactIdx: number;
    title: string;
    stage: "qualification" | "proposal" | "won" | "lost";
    value_zar: number | null;
    expected_close: string | null;
  }[] = [
    {
      contactIdx: 0,
      title: "Industrial woven — conveyor rebuild (Apex)",
      stage: "proposal",
      value_zar: 485_000,
      expected_close: close(21),
    },
    {
      contactIdx: 1,
      title: "Agricultural shade cloth rollout",
      stage: "won",
      value_zar: 132_500,
      expected_close: close(-7),
    },
    {
      contactIdx: 2,
      title: "Logistics hub — technical fabric pilot",
      stage: "qualification",
      value_zar: 95_000,
      expected_close: close(45),
    },
    {
      contactIdx: 3,
      title: "Cleaning products — opening order",
      stage: "won",
      value_zar: 42_300,
      expected_close: close(-3),
    },
    {
      contactIdx: 5,
      title: "Construction safety textiles RFQ",
      stage: "qualification",
      value_zar: 78_000,
      expected_close: close(14),
    },
    {
      contactIdx: 0,
      title: "Apex — mineral processing belts (lost to competitor)",
      stage: "lost",
      value_zar: 210_000,
      expected_close: close(-30),
    },
  ];

  const dealIds: string[] = [];
  for (const d of deals) {
    const cid = contactIds[d.contactIdx];
    const { error, id } = await saveDeal(
      {
        contact_id: cid,
        title: d.title,
        stage: d.stage,
        value_zar: d.value_zar,
        expected_close: d.expected_close,
        owner_id: ownerId,
      },
      actor
    );
    if (error) return { ok: false, message: error.message, error };
    if (!id) return { ok: false, message: "Deal save did not return id.", error: new Error("missing id") };
    dealIds.push(id);
  }

  const [dealApex, dealAgri, dealLog, dealClean, dealScaffold, _dealLost] = dealIds;

  const activities: {
    kind: "call" | "email" | "meeting" | "note";
    subject: string;
    body: string | null;
    occurred_at: string;
    contact_id: string | null;
    deal_id: string | null;
  }[] = [
    {
      kind: "call",
      subject: "Intro call — Apex conveyor specs",
      body: "Requested GSM range and lead time for 850 g/m² industrial woven.",
      occurred_at: day(5),
      contact_id: apex,
      deal_id: dealApex,
    },
    {
      kind: "email",
      subject: "Sent shade cloth samples to Lowveld Agri",
      body: "Courier tracking shared; follow-up meeting booked.",
      occurred_at: day(4),
      contact_id: agri,
      deal_id: dealAgri,
    },
    {
      kind: "meeting",
      subject: "Site walk — GLH warehouse lanes",
      body: "Measured roller centres; discussed belt width options.",
      occurred_at: day(2),
      contact_id: logistics,
      deal_id: dealLog,
    },
    {
      kind: "note",
      subject: "Hygiene — first order confirmed",
      body: "PO received; dispatch from FG warehouse.",
      occurred_at: day(1),
      contact_id: hygiene,
      deal_id: dealClean,
    },
    {
      kind: "call",
      subject: "ERS — scaffolding net dimensions",
      body: "Awaiting final bay counts from site engineer.",
      occurred_at: day(0),
      contact_id: scaffold,
      deal_id: dealScaffold,
    },
    {
      kind: "email",
      subject: "FibreMax — Q2 pricing hold",
      body: "Supplier holding polyester quote until month-end.",
      occurred_at: day(3),
      contact_id: contactIds[4],
      deal_id: null,
    },
  ];

  for (const a of activities) {
    const { error } = await insertActivity(
      {
        contact_id: a.contact_id,
        deal_id: a.deal_id,
        kind: a.kind,
        subject: a.subject,
        body: a.body,
        occurred_at: a.occurred_at,
        created_by: actor.id,
      },
      actor
    );
    if (error) return { ok: false, message: error.message, error };
  }

  const dueSoon = new Date();
  dueSoon.setDate(dueSoon.getDate() + 3);
  const tasks = [
    {
      title: "Send revised quote — Apex conveyor rebuild",
      due_at: iso(dueSoon),
      contact_id: apex,
      deal_id: dealApex,
    },
    {
      title: "Follow up GLH pilot decision",
      due_at: day(-1),
      contact_id: logistics,
      deal_id: dealLog,
    },
    {
      title: "Prepare scaffold net pricing — ERS",
      due_at: iso(new Date(Date.now() + 86400000 * 5)),
      contact_id: scaffold,
      deal_id: dealScaffold,
    },
    {
      title: "Review cleaning products reorder schedule",
      due_at: null as string | null,
      contact_id: hygiene,
      deal_id: dealClean,
    },
  ];

  for (const t of tasks) {
    const { error } = await insertTask(
      {
        title: t.title,
        due_at: t.due_at,
        assignee_id: ownerId,
        contact_id: t.contact_id,
        deal_id: t.deal_id,
      },
      actor
    );
    if (error) return { ok: false, message: error.message, error };
  }

  const force = options?.force === true;
  const extras: string[] = [];

  if (quotesDataAvailable()) {
    try {
      extras.push(
        await seedQuotePipeline(
          actor,
          ownerId,
          apex,
          agri,
          logistics,
          hygiene,
          dealApex,
          dealAgri,
          dealLog,
          dealClean,
          contactDefs,
          close
        )
      );
    } catch (e) {
      extras.push(`Quotes demo skipped: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  try {
    const w = await seedWorkforceDemo(actor, force);
    if (w) extras.push(w);
  } catch (e) {
    extras.push(`Workforce demo: ${e instanceof Error ? e.message : String(e)}`);
  }

  /* Inventory: seed locations + receipts only when no locations yet (avoid duplicate sites). */
  try {
    const locs = await invListLocations();
    let receivingId: string | null = null;
    if (locs.length === 0) {
      const seedLocs: { name: string; zone: "receiving" | "production" | "wip" | "warehouse" | "export" | "quarantine"; sort_order: number }[] = [
        { name: "Main receiving", zone: "receiving", sort_order: 0 },
        { name: "Spinning & weaving floor", zone: "production", sort_order: 1 },
        { name: "WIP store", zone: "wip", sort_order: 2 },
        { name: "Finished goods — Aisle 1", zone: "warehouse", sort_order: 3 },
        { name: "Export staging", zone: "export", sort_order: 4 },
      ];
      for (const L of seedLocs) {
        const { error } = await invSaveLocation(
          { name: L.name, zone: L.zone, sort_order: L.sort_order },
          actor
        );
        if (error) throw error;
      }
      const refreshed = await invListLocations();
      receivingId = refreshed.find((l) => l.zone === "receiving")?.id ?? refreshed[0]?.id ?? null;
    } else {
      receivingId = locs.find((l) => l.zone === "receiving")?.id ?? locs[0]?.id ?? null;
    }

    if (receivingId) {
      const items = await invListItems(true);
      const bySku = new Map(items.map((i) => [i.sku, i.id]));
      const receipts: { sku: string; qty: number; notes: string }[] = [
        { sku: "SM-RM-PET-FIB", qty: 2400, notes: "Sample receipt — synthetic staple (kg)" },
        { sku: "SM-RM-COT-LINT", qty: 900, notes: "Sample receipt — cotton lint (kg)" },
        { sku: "SM-YRN-N32-CB", qty: 180, notes: "Sample receipt — yarn cones" },
        { sku: "SM-WIP-SLIVER", qty: 900, notes: "Sample receipt — carded sliver (kg)" },
        { sku: "SM-WIP-ROV", qty: 500, notes: "Sample receipt — roving cans (kg)" },
        { sku: "SM-TEX-WOV-480", qty: 42, notes: "Sample receipt — greige rolls" },
        { sku: "SM-WOV-GREIGE-220", qty: 20, notes: "Sample receipt — light greige (rolls)" },
        { sku: "SM-CLEAN-APC", qty: 360, notes: "Sample receipt — all purpose cleaner (ea)" },
      ];
      for (const r of receipts) {
        const itemId = bySku.get(r.sku);
        if (!itemId) continue;
        const { error } = await invPostReceipt(actor, {
          item_id: itemId,
          location_id: receivingId,
          qty: r.qty,
          unit_cost: null,
          source: "import",
          notes: `${r.notes} ${SAMPLE_DATA_MARKER}`,
        });
        if (error) throw error;
      }
    }

    try {
      const ps = await seedProductionAndShipment(actor, dealAgri, force);
      if (ps) extras.push(ps);
    } catch (e) {
      extras.push(`Production/shipment: ${e instanceof Error ? e.message : String(e)}`);
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const more = extras.length ? ` ${extras.join(" ")}` : "";
    return {
      ok: true,
      message: `Sample CRM rows added; inventory seed skipped: ${err.message}.${more}`,
    };
  }

  const tail = extras.length ? ` ${extras.join(" ")}` : "";
  return {
    ok: true,
    message: `Sample data loaded: 6 contacts, 6 deals, 6 activities, 4 tasks. Inventory locations/receipts added if the warehouse was empty and matching SKUs exist.${tail}`,
  };
}
