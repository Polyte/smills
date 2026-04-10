/**
 * Inventory / warehouse — Supabase or local SQLite (same pattern as crmRepo).
 */
import { getSupabase } from "../supabaseClient";
import type { Database } from "../../app/crm/database.types";
import type {
  InvItemKind,
  InvLocationZone,
  InvMovementType,
  InvPOStatus,
  InvReceiptSource,
  InvShipmentStatus,
} from "../../app/crm/database.types";
import { crmUsesSupabase, type CrmActor } from "./crmRepo";
import { isOpsAdmin } from "./roles";
import { addDays, format, startOfDay, startOfWeek, subDays, subWeeks } from "date-fns";
import { dbAll, dbRun, getLocalSqliteDb } from "./sqlite/engine";
import type { SqlValue } from "sql.js";

type ItemRow = Database["public"]["Tables"]["inv_items"]["Row"];
type InvItemInsert = Database["public"]["Tables"]["inv_items"]["Insert"];
type InvItemUpdate = Database["public"]["Tables"]["inv_items"]["Update"];
type LocRow = Database["public"]["Tables"]["inv_locations"]["Row"];
type PORow = Database["public"]["Tables"]["inv_production_orders"]["Row"];
type LineInRow = Database["public"]["Tables"]["inv_production_lines_in"]["Row"];
type LineOutRow = Database["public"]["Tables"]["inv_production_lines_out"]["Row"];
type ShipRow = Database["public"]["Tables"]["inv_shipments"]["Row"];
type ShipLineRow = Database["public"]["Tables"]["inv_shipment_lines"]["Row"];
type MovRow = Database["public"]["Tables"]["inv_movements"]["Row"];
type BalanceRow = Database["public"]["Views"]["inv_stock_balances"]["Row"];

function assertWrite(actor: CrmActor) {
  if (actor.role === "sales") throw new Error("Not allowed for your role.");
}

function mapSqliteItem(r: Record<string, SqlValue>): ItemRow {
  const desc = r.description;
  const st = r.sales_target_qty;
  const pt = r.production_target_qty;
  return {
    ...r,
    is_active: Boolean(r.is_active),
    standard_cost: Number(r.standard_cost ?? 0),
    list_price_zar: Number(r.list_price_zar ?? 0),
    category: String(r.category ?? "Mill & yarn"),
    description:
      desc === null || desc === undefined || desc === ""
        ? null
        : String(desc),
    reorder_min: Number(r.reorder_min ?? 0),
    sales_target_qty:
      st === null || st === undefined || st === "" ? null : Number(st),
    production_target_qty:
      pt === null || pt === undefined || pt === "" ? null : Number(pt),
  } as ItemRow;
}

export async function invListItems(activeOnly = false): Promise<ItemRow[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    let q = supabase.from("inv_items").select("*").order("category").order("sku");
    if (activeOnly) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data as ItemRow[]) ?? [];
  }
  const db = await getLocalSqliteDb();
  const sql = activeOnly
    ? "SELECT * FROM inv_items WHERE is_active = 1 ORDER BY category, sku"
    : "SELECT * FROM inv_items ORDER BY category, sku";
  return dbAll<Record<string, SqlValue>>(db, sql).map(mapSqliteItem);
}

function parseOptionalTarget(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export async function invSaveItem(
  row: Partial<ItemRow> & { sku: string; name: string; kind: InvItemKind },
  actor: CrmActor
): Promise<{ error: Error | null }> {
  try {
    assertWrite(actor);
    const isAdmin = isOpsAdmin(actor.role);
    const salesT = isAdmin ? parseOptionalTarget(row.sales_target_qty) : undefined;
    const prodT = isAdmin ? parseOptionalTarget(row.production_target_qty) : undefined;
    const adminFullTargets =
      isAdmin &&
      row.sales_target_qty !== undefined &&
      row.production_target_qty !== undefined;
    if (crmUsesSupabase()) {
      const supabase = getSupabase();
      if (row.id) {
        const base: InvItemUpdate = {
          sku: row.sku,
          name: row.name,
          kind: row.kind,
          uom: row.uom ?? "ea",
          standard_cost: row.standard_cost ?? 0,
          list_price_zar: row.list_price_zar ?? 0,
          is_active: row.is_active ?? true,
          category: row.category ?? "Mill & yarn",
          description: row.description ?? null,
          reorder_min: row.reorder_min ?? 0,
        };
        if (adminFullTargets) {
          base.sales_target_qty = salesT;
          base.production_target_qty = prodT;
        }
        const { error } = await supabase.from("inv_items").update(base).eq("id", row.id);
        return { error: error ? new Error(error.message) : null };
      }
      const insertRow: InvItemInsert = {
        sku: row.sku,
        name: row.name,
        kind: row.kind,
        uom: row.uom ?? "ea",
        standard_cost: row.standard_cost ?? 0,
        list_price_zar: row.list_price_zar ?? 0,
        is_active: row.is_active ?? true,
        category: row.category ?? "Mill & yarn",
        description: row.description ?? null,
        reorder_min: row.reorder_min ?? 0,
        ...(adminFullTargets ? { sales_target_qty: salesT, production_target_qty: prodT } : {}),
      };
      const { error } = await supabase.from("inv_items").insert(insertRow);
      return { error: error ? new Error(error.message) : null };
    }
    const db = await getLocalSqliteDb();
    const now = new Date().toISOString();
    if (row.id) {
      if (adminFullTargets) {
        dbRun(
          db,
          `UPDATE inv_items SET updated_at = ?, sku = ?, name = ?, kind = ?, uom = ?, standard_cost = ?, list_price_zar = ?, is_active = ?, category = ?, description = ?, reorder_min = ?, sales_target_qty = ?, production_target_qty = ? WHERE id = ?`,
          [
            now,
            row.sku,
            row.name,
            row.kind,
            row.uom ?? "ea",
            row.standard_cost ?? 0,
            row.list_price_zar ?? 0,
            row.is_active === false ? 0 : 1,
            row.category ?? "Mill & yarn",
            row.description ?? null,
            row.reorder_min ?? 0,
            salesT,
            prodT,
            row.id,
          ]
        );
      } else {
        dbRun(
          db,
          `UPDATE inv_items SET updated_at = ?, sku = ?, name = ?, kind = ?, uom = ?, standard_cost = ?, list_price_zar = ?, is_active = ?, category = ?, description = ?, reorder_min = ? WHERE id = ?`,
          [
            now,
            row.sku,
            row.name,
            row.kind,
            row.uom ?? "ea",
            row.standard_cost ?? 0,
            row.list_price_zar ?? 0,
            row.is_active === false ? 0 : 1,
            row.category ?? "Mill & yarn",
            row.description ?? null,
            row.reorder_min ?? 0,
            row.id,
          ]
        );
      }
    } else {
      const id = crypto.randomUUID();
      if (adminFullTargets) {
        dbRun(
          db,
          `INSERT INTO inv_items (id, created_at, updated_at, sku, name, kind, uom, standard_cost, list_price_zar, is_active, category, description, reorder_min, sales_target_qty, production_target_qty) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            id,
            now,
            now,
            row.sku,
            row.name,
            row.kind,
            row.uom ?? "ea",
            row.standard_cost ?? 0,
            row.list_price_zar ?? 0,
            row.is_active === false ? 0 : 1,
            row.category ?? "Mill & yarn",
            row.description ?? null,
            row.reorder_min ?? 0,
            salesT,
            prodT,
          ]
        );
      } else {
        dbRun(
          db,
          `INSERT INTO inv_items (id, created_at, updated_at, sku, name, kind, uom, standard_cost, list_price_zar, is_active, category, description, reorder_min) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            id,
            now,
            now,
            row.sku,
            row.name,
            row.kind,
            row.uom ?? "ea",
            row.standard_cost ?? 0,
            row.list_price_zar ?? 0,
            row.is_active === false ? 0 : 1,
            row.category ?? "Mill & yarn",
            row.description ?? null,
            row.reorder_min ?? 0,
          ]
        );
      }
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Save failed") };
  }
}

export async function invDeleteItem(id: string, actor: CrmActor): Promise<{ error: Error | null }> {
  if (!isOpsAdmin(actor.role)) return { error: new Error("Only operations managers can delete items.") };
  try {
    if (crmUsesSupabase()) {
      const { error } = await getSupabase().from("inv_items").delete().eq("id", id);
      return { error: error ? new Error(error.message) : null };
    }
    const db = await getLocalSqliteDb();
    dbRun(db, "DELETE FROM inv_items WHERE id = ?", [id]);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Delete failed") };
  }
}

export async function invListLocations(): Promise<LocRow[]> {
  if (crmUsesSupabase()) {
    const { data, error } = await getSupabase()
      .from("inv_locations")
      .select("*")
      .order("sort_order")
      .order("name");
    if (error) throw new Error(error.message);
    return (data as LocRow[]) ?? [];
  }
  const db = await getLocalSqliteDb();
  return dbAll<LocRow>(db, "SELECT * FROM inv_locations ORDER BY sort_order, name");
}

export async function invSaveLocation(
  row: Partial<LocRow> & { name: string; zone: InvLocationZone },
  actor: CrmActor
): Promise<{ error: Error | null }> {
  try {
    assertWrite(actor);
    if (crmUsesSupabase()) {
      const supabase = getSupabase();
      if (row.id) {
        const { error } = await supabase
          .from("inv_locations")
          .update({ name: row.name, zone: row.zone, sort_order: row.sort_order ?? 0 })
          .eq("id", row.id);
        return { error: error ? new Error(error.message) : null };
      }
      const { error } = await supabase.from("inv_locations").insert({
        name: row.name,
        zone: row.zone,
        sort_order: row.sort_order ?? 0,
      });
      return { error: error ? new Error(error.message) : null };
    }
    const db = await getLocalSqliteDb();
    const now = new Date().toISOString();
    if (row.id) {
      dbRun(db, "UPDATE inv_locations SET updated_at = ?, name = ?, zone = ?, sort_order = ? WHERE id = ?", [
        now,
        row.name,
        row.zone,
        row.sort_order ?? 0,
        row.id,
      ]);
    } else {
      const id = crypto.randomUUID();
      dbRun(
        db,
        "INSERT INTO inv_locations (id, created_at, updated_at, name, zone, sort_order) VALUES (?,?,?,?,?,?)",
        [id, now, now, row.name, row.zone, row.sort_order ?? 0]
      );
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Save failed") };
  }
}

export async function invDeleteLocation(id: string, actor: CrmActor): Promise<{ error: Error | null }> {
  if (!isOpsAdmin(actor.role))
    return { error: new Error("Only operations managers can delete locations.") };
  try {
    if (crmUsesSupabase()) {
      const { error } = await getSupabase().from("inv_locations").delete().eq("id", id);
      return { error: error ? new Error(error.message) : null };
    }
    dbRun(await getLocalSqliteDb(), "DELETE FROM inv_locations WHERE id = ?", [id]);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Delete failed") };
  }
}

async function getBalance(itemId: string, locationId: string): Promise<number> {
  if (crmUsesSupabase()) {
    const { data, error } = await getSupabase()
      .from("inv_stock_balances")
      .select("qty")
      .eq("item_id", itemId)
      .eq("location_id", locationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Number((data as { qty?: number } | null)?.qty ?? 0);
  }
  const db = await getLocalSqliteDb();
  const rows = dbAll<{ q: number }>(
    db,
    "SELECT COALESCE(SUM(qty_delta),0) AS q FROM inv_movements WHERE item_id = ? AND location_id = ?",
    [itemId, locationId]
  );
  return Number(rows[0]?.q ?? 0);
}

async function insertMovement(
  actor: CrmActor,
  m: {
    movement_type: InvMovementType;
    item_id: string;
    location_id: string;
    qty_delta: number;
    unit_cost?: number | null;
    source?: InvReceiptSource | null;
    notes?: string | null;
    ref_production_order_id?: string | null;
    ref_shipment_id?: string | null;
    ref_deal_id?: string | null;
  }
): Promise<void> {
  if (crmUsesSupabase()) {
    const { error } = await getSupabase().from("inv_movements").insert({
      ...m,
      created_by: actor.id,
    });
    if (error) throw new Error(error.message);
    return;
  }
  const db = await getLocalSqliteDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  dbRun(
    db,
    `INSERT INTO inv_movements (id, created_at, movement_type, item_id, location_id, qty_delta, unit_cost, source, notes, ref_production_order_id, ref_shipment_id, ref_deal_id, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      now,
      m.movement_type,
      m.item_id,
      m.location_id,
      m.qty_delta,
      m.unit_cost ?? null,
      m.source ?? null,
      m.notes ?? null,
      m.ref_production_order_id ?? null,
      m.ref_shipment_id ?? null,
      m.ref_deal_id ?? null,
      actor.id,
    ]
  );
}

export async function invPostReceipt(
  actor: CrmActor,
  p: {
    item_id: string;
    location_id: string;
    qty: number;
    unit_cost?: number | null;
    source: InvReceiptSource;
    notes?: string;
  }
): Promise<{ error: Error | null }> {
  try {
    if (p.qty <= 0) return { error: new Error("Quantity must be positive.") };
    await insertMovement(actor, {
      movement_type: "RECEIPT",
      item_id: p.item_id,
      location_id: p.location_id,
      qty_delta: p.qty,
      unit_cost: p.unit_cost ?? null,
      source: p.source,
      notes: p.notes ?? null,
    });
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Receipt failed") };
  }
}

export async function invPostTransfer(
  actor: CrmActor,
  p: { item_id: string; from_location_id: string; to_location_id: string; qty: number; notes?: string }
): Promise<{ error: Error | null }> {
  try {
    assertWrite(actor);
    if (p.qty <= 0) return { error: new Error("Quantity must be positive.") };
    const bal = await getBalance(p.item_id, p.from_location_id);
    if (bal < p.qty) return { error: new Error(`Insufficient stock at source (have ${bal}).`) };
    await insertMovement(actor, {
      movement_type: "TRANSFER_OUT",
      item_id: p.item_id,
      location_id: p.from_location_id,
      qty_delta: -p.qty,
      notes: p.notes ?? null,
    });
    await insertMovement(actor, {
      movement_type: "TRANSFER_IN",
      item_id: p.item_id,
      location_id: p.to_location_id,
      qty_delta: p.qty,
      notes: p.notes ?? null,
    });
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Transfer failed") };
  }
}

export async function invPostAdjustment(
  actor: CrmActor,
  p: { item_id: string; location_id: string; qty_delta: number; notes?: string }
): Promise<{ error: Error | null }> {
  try {
    if (!isOpsAdmin(actor.role)) return { error: new Error("Only operations managers can adjust stock.") };
    await insertMovement(actor, {
      movement_type: "ADJUSTMENT",
      item_id: p.item_id,
      location_id: p.location_id,
      qty_delta: p.qty_delta,
      notes: p.notes ?? null,
    });
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Adjustment failed") };
  }
}

export async function invListStockBalances(): Promise<BalanceRow[]> {
  if (crmUsesSupabase()) {
    const { data, error } = await getSupabase().from("inv_stock_balances").select("*");
    if (error) throw new Error(error.message);
    return (data as BalanceRow[]) ?? [];
  }
  const db = await getLocalSqliteDb();
  return dbAll<BalanceRow>(
    db,
    `SELECT m.item_id, m.location_id, SUM(m.qty_delta) AS qty
     FROM inv_movements m
     INNER JOIN inv_items i ON i.id = m.item_id
     GROUP BY m.item_id, m.location_id
     HAVING ABS(SUM(m.qty_delta)) > 1e-9`
  );
}

export async function invListMovements(limit = 50): Promise<MovRow[]> {
  if (crmUsesSupabase()) {
    const { data, error } = await getSupabase()
      .from("inv_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data as MovRow[]) ?? [];
  }
  const db = await getLocalSqliteDb();
  return dbAll<MovRow>(db, "SELECT * FROM inv_movements ORDER BY created_at DESC LIMIT ?", [limit]);
}

export async function invListProductionOrders(): Promise<PORow[]> {
  if (crmUsesSupabase()) {
    const { data, error } = await getSupabase()
      .from("inv_production_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as PORow[]) ?? [];
  }
  return dbAll<PORow>(
    await getLocalSqliteDb(),
    "SELECT * FROM inv_production_orders ORDER BY created_at DESC"
  );
}

export async function invGetProductionOrder(id: string): Promise<{
  po: PORow;
  linesIn: LineInRow[];
  linesOut: LineOutRow[];
} | null> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data: po, error: e1 } = await supabase.from("inv_production_orders").select("*").eq("id", id).maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!po) return null;
    const { data: li, error: e2 } = await supabase.from("inv_production_lines_in").select("*").eq("production_order_id", id);
    if (e2) throw new Error(e2.message);
    const { data: lo, error: e3 } = await supabase.from("inv_production_lines_out").select("*").eq("production_order_id", id);
    if (e3) throw new Error(e3.message);
    return { po: po as PORow, linesIn: (li as LineInRow[]) ?? [], linesOut: (lo as LineOutRow[]) ?? [] };
  }
  const db = await getLocalSqliteDb();
  const po = dbAll<PORow>(db, "SELECT * FROM inv_production_orders WHERE id = ?", [id])[0];
  if (!po) return null;
  const linesIn = dbAll<LineInRow>(db, "SELECT * FROM inv_production_lines_in WHERE production_order_id = ?", [id]);
  const linesOut = dbAll<LineOutRow>(db, "SELECT * FROM inv_production_lines_out WHERE production_order_id = ?", [id]);
  return { po, linesIn, linesOut };
}

export async function invCreateProductionOrder(
  actor: CrmActor,
  p: {
    issue_location_id: string;
    receipt_location_id: string;
    notes?: string;
    linesIn: { item_id: string; qty_planned: number }[];
    linesOut: { item_id: string; qty_planned: number }[];
  }
): Promise<{ id: string | null; error: Error | null }> {
  try {
    assertWrite(actor);
    if (crmUsesSupabase()) {
      const supabase = getSupabase();
      const { data: po, error: e1 } = await supabase
        .from("inv_production_orders")
        .insert({
          status: "draft",
          notes: p.notes ?? null,
          issue_location_id: p.issue_location_id,
          receipt_location_id: p.receipt_location_id,
          created_by: actor.id,
        })
        .select("id")
        .single();
      if (e1) return { id: null, error: new Error(e1.message) };
      const pid = po.id as string;
      for (const l of p.linesIn) {
        const { error } = await supabase.from("inv_production_lines_in").insert({
          production_order_id: pid,
          item_id: l.item_id,
          qty_planned: l.qty_planned,
        });
        if (error) return { id: null, error: new Error(error.message) };
      }
      for (const l of p.linesOut) {
        const { error } = await supabase.from("inv_production_lines_out").insert({
          production_order_id: pid,
          item_id: l.item_id,
          qty_planned: l.qty_planned,
        });
        if (error) return { id: null, error: new Error(error.message) };
      }
      return { id: pid, error: null };
    }
    const db = await getLocalSqliteDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    dbRun(
      db,
      `INSERT INTO inv_production_orders (id, created_at, updated_at, status, notes, issue_location_id, receipt_location_id, created_by) VALUES (?,?,?,?,?,?,?,?)`,
      [id, now, now, "draft", p.notes ?? null, p.issue_location_id, p.receipt_location_id, actor.id]
    );
    for (const l of p.linesIn) {
      dbRun(
        db,
        "INSERT INTO inv_production_lines_in (id, production_order_id, item_id, qty_planned) VALUES (?,?,?,?)",
        [crypto.randomUUID(), id, l.item_id, l.qty_planned]
      );
    }
    for (const l of p.linesOut) {
      dbRun(
        db,
        "INSERT INTO inv_production_lines_out (id, production_order_id, item_id, qty_planned) VALUES (?,?,?,?)",
        [crypto.randomUUID(), id, l.item_id, l.qty_planned]
      );
    }
    return { id, error: null };
  } catch (e) {
    return { id: null, error: e instanceof Error ? e : new Error("Create failed") };
  }
}

export async function invReleaseProductionOrder(id: string, actor: CrmActor): Promise<{ error: Error | null }> {
  try {
    assertWrite(actor);
    const now = new Date().toISOString();
    if (crmUsesSupabase()) {
      const { error } = await getSupabase()
        .from("inv_production_orders")
        .update({ status: "released", released_at: now })
        .eq("id", id)
        .eq("status", "draft");
      return { error: error ? new Error(error.message) : null };
    }
    const db = await getLocalSqliteDb();
    dbRun(
      db,
      "UPDATE inv_production_orders SET updated_at = ?, status = 'released', released_at = ? WHERE id = ? AND status = 'draft'",
      [now, now, id]
    );
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Release failed") };
  }
}

export async function invCompleteProductionOrder(id: string, actor: CrmActor): Promise<{ error: Error | null }> {
  try {
    assertWrite(actor);
    const bundle = await invGetProductionOrder(id);
    if (!bundle) return { error: new Error("Order not found.") };
    const { po, linesIn, linesOut } = bundle;
    if (po.status !== "released") return { error: new Error("Order must be released before completion.") };

    for (const l of linesIn) {
      const qty = l.qty_actual ?? l.qty_planned;
      if (qty <= 0) continue;
      const bal = await getBalance(l.item_id, po.issue_location_id);
      if (bal < qty) {
        return {
          error: new Error(`Insufficient raw stock for line (need ${qty}, have ${bal} at issue location).`),
        };
      }
    }

    const now = new Date().toISOString();
    for (const l of linesIn) {
      const qty = l.qty_actual ?? l.qty_planned;
      if (qty <= 0) continue;
      await insertMovement(actor, {
        movement_type: "PRODUCTION_ISSUE",
        item_id: l.item_id,
        location_id: po.issue_location_id,
        qty_delta: -qty,
        ref_production_order_id: id,
      });
    }
    for (const l of linesOut) {
      const qty = l.qty_actual ?? l.qty_planned;
      if (qty <= 0) continue;
      await insertMovement(actor, {
        movement_type: "PRODUCTION_RECEIPT",
        item_id: l.item_id,
        location_id: po.receipt_location_id,
        qty_delta: qty,
        ref_production_order_id: id,
      });
    }

    if (crmUsesSupabase()) {
      const { error } = await getSupabase()
        .from("inv_production_orders")
        .update({ status: "completed", completed_at: now })
        .eq("id", id);
      if (error) return { error: new Error(error.message) };
    } else {
      dbRun(await getLocalSqliteDb(), "UPDATE inv_production_orders SET updated_at = ?, status = 'completed', completed_at = ? WHERE id = ?", [
        now,
        now,
        id,
      ]);
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Complete failed") };
  }
}

export async function invUpdatePOLineActuals(
  linesIn: { id: string; qty_actual: number | null }[],
  linesOut: { id: string; qty_actual: number | null }[],
  actor: CrmActor
): Promise<{ error: Error | null }> {
  try {
    assertWrite(actor);
    if (crmUsesSupabase()) {
      const supabase = getSupabase();
      for (const l of linesIn) {
        const { error } = await supabase.from("inv_production_lines_in").update({ qty_actual: l.qty_actual }).eq("id", l.id);
        if (error) return { error: new Error(error.message) };
      }
      for (const l of linesOut) {
        const { error } = await supabase.from("inv_production_lines_out").update({ qty_actual: l.qty_actual }).eq("id", l.id);
        if (error) return { error: new Error(error.message) };
      }
      return { error: null };
    }
    const db = await getLocalSqliteDb();
    for (const l of linesIn) {
      dbRun(db, "UPDATE inv_production_lines_in SET qty_actual = ? WHERE id = ?", [l.qty_actual, l.id]);
    }
    for (const l of linesOut) {
      dbRun(db, "UPDATE inv_production_lines_out SET qty_actual = ? WHERE id = ?", [l.qty_actual, l.id]);
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Update failed") };
  }
}

export async function invListShipments(): Promise<ShipRow[]> {
  if (crmUsesSupabase()) {
    const { data, error } = await getSupabase().from("inv_shipments").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as ShipRow[]) ?? [];
  }
  return dbAll<ShipRow>(await getLocalSqliteDb(), "SELECT * FROM inv_shipments ORDER BY created_at DESC");
}

export async function invGetShipment(id: string): Promise<{ ship: ShipRow; lines: ShipLineRow[] } | null> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data: ship, error: e1 } = await supabase.from("inv_shipments").select("*").eq("id", id).maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!ship) return null;
    const { data: lines, error: e2 } = await supabase.from("inv_shipment_lines").select("*").eq("shipment_id", id);
    if (e2) throw new Error(e2.message);
    return { ship: ship as ShipRow, lines: (lines as ShipLineRow[]) ?? [] };
  }
  const db = await getLocalSqliteDb();
  const ship = dbAll<ShipRow>(db, "SELECT * FROM inv_shipments WHERE id = ?", [id])[0];
  if (!ship) return null;
  const lines = dbAll<ShipLineRow>(db, "SELECT * FROM inv_shipment_lines WHERE shipment_id = ?", [id]);
  return { ship, lines };
}

export async function invCreateShipment(
  actor: CrmActor,
  dealId: string | null,
  lines: { item_id: string; location_id: string; qty: number }[]
): Promise<{ id: string | null; error: Error | null }> {
  try {
    assertWrite(actor);
    if (crmUsesSupabase()) {
      const supabase = getSupabase();
      const { data: s, error: e1 } = await supabase
        .from("inv_shipments")
        .insert({ deal_id: dealId, status: "draft", created_by: actor.id })
        .select("id")
        .single();
      if (e1) return { id: null, error: new Error(e1.message) };
      const sid = s.id as string;
      for (const l of lines) {
        const { error } = await supabase.from("inv_shipment_lines").insert({
          shipment_id: sid,
          item_id: l.item_id,
          location_id: l.location_id,
          qty: l.qty,
        });
        if (error) return { id: null, error: new Error(error.message) };
      }
      return { id: sid, error: null };
    }
    const db = await getLocalSqliteDb();
    const sid = crypto.randomUUID();
    const now = new Date().toISOString();
    dbRun(
      db,
      "INSERT INTO inv_shipments (id, created_at, updated_at, status, deal_id, created_by) VALUES (?,?,?,?,?,?)",
      [sid, now, now, "draft", dealId, actor.id]
    );
    for (const l of lines) {
      dbRun(
        db,
        "INSERT INTO inv_shipment_lines (id, shipment_id, item_id, location_id, qty) VALUES (?,?,?,?,?)",
        [crypto.randomUUID(), sid, l.item_id, l.location_id, l.qty]
      );
    }
    return { id: sid, error: null };
  } catch (e) {
    return { id: null, error: e instanceof Error ? e : new Error("Create shipment failed") };
  }
}

export async function invCompleteShipment(id: string, actor: CrmActor): Promise<{ error: Error | null }> {
  try {
    assertWrite(actor);
    const bundle = await invGetShipment(id);
    if (!bundle) return { error: new Error("Shipment not found.") };
    const { ship, lines } = bundle;
    if (ship.status === "shipped") return { error: new Error("Already shipped.") };
    for (const ln of lines) {
      const bal = await getBalance(ln.item_id, ln.location_id);
      if (bal < ln.qty) {
        return { error: new Error(`Insufficient stock for SKU at pick location (need ${ln.qty}, have ${bal}).`) };
      }
    }
    for (const ln of lines) {
      await insertMovement(actor, {
        movement_type: "SHIPMENT",
        item_id: ln.item_id,
        location_id: ln.location_id,
        qty_delta: -ln.qty,
        ref_shipment_id: id,
        ref_deal_id: ship.deal_id,
      });
    }
    const now = new Date().toISOString();
    if (crmUsesSupabase()) {
      const { error } = await getSupabase()
        .from("inv_shipments")
        .update({ status: "shipped", shipped_at: now })
        .eq("id", id);
      if (error) return { error: new Error(error.message) };
    } else {
      dbRun(await getLocalSqliteDb(), "UPDATE inv_shipments SET updated_at = ?, status = 'shipped', shipped_at = ? WHERE id = ?", [
        now,
        now,
        id,
      ]);
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Ship failed") };
  }
}

export async function invOverviewStats(): Promise<{
  openPOs: number;
  draftShipments: number;
  totalStockValue: number;
  recentMovements: number;
}> {
  const pos = await invListProductionOrders();
  const ships = await invListShipments();
  const balances = await invListStockBalances();
  const items = await invListItems(false);
  const costById = new Map(items.map((i) => [i.id, Number(i.standard_cost ?? 0)]));
  let totalStockValue = 0;
  for (const b of balances) {
    totalStockValue += Number(b.qty) * (costById.get(b.item_id) ?? 0);
  }
  return {
    openPOs: pos.filter((p) => p.status === "draft" || p.status === "released").length,
    draftShipments: ships.filter((s) => s.status === "draft" || s.status === "picked").length,
    totalStockValue,
    recentMovements: (await invListMovements(200)).length,
  };
}

export async function invReportValuation(): Promise<{ item_id: string; sku: string; name: string; qty: number; value: number }[]> {
  const balances = await invListStockBalances();
  const items = await invListItems(false);
  const byId = new Map(items.map((i) => [i.id, i]));
  const agg = new Map<string, { qty: number; value: number }>();
  for (const b of balances) {
    const it = byId.get(b.item_id);
    if (!it) continue;
    const q = Number(b.qty);
    const v = q * Number(it.standard_cost ?? 0);
    const cur = agg.get(b.item_id) ?? { qty: 0, value: 0 };
    cur.qty += q;
    cur.value += v;
    agg.set(b.item_id, cur);
  }
  return [...agg.entries()].map(([item_id, { qty, value }]) => {
    const it = byId.get(item_id)!;
    return { item_id, sku: it.sku, name: it.name, qty, value };
  });
}

export async function invReportDealMargins(): Promise<
  { deal_id: string; title: string; value_zar: number | null; est_cost: number }[]
> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data: deals, error } = await supabase.from("deals").select("id, title, value_zar, stage").eq("stage", "won");
    if (error) throw new Error(error.message);
    const { data: movements } = await supabase
      .from("inv_movements")
      .select("ref_deal_id, item_id, qty_delta")
      .eq("movement_type", "SHIPMENT");
    const items = await invListItems(true);
    const costById = new Map(items.map((i) => [i.id, Number(i.standard_cost ?? 0)]));
    const costByDeal = new Map<string, number>();
    for (const m of movements ?? []) {
      const did = m.ref_deal_id as string;
      if (!did) continue;
      const q = Math.abs(Number(m.qty_delta));
      const c = (costByDeal.get(did) ?? 0) + q * (costById.get(m.item_id as string) ?? 0);
      costByDeal.set(did, c);
    }
    return (
      deals?.map((d) => ({
        deal_id: d.id,
        title: d.title,
        value_zar: d.value_zar,
        est_cost: costByDeal.get(d.id) ?? 0,
      })) ?? []
    );
  }
  const db = await getLocalSqliteDb();
  const deals = dbAll<{ id: string; title: string; value_zar: number | null }>(
    db,
    "SELECT id, title, value_zar FROM deals WHERE stage = 'won'"
  );
  const movements = dbAll<{ ref_deal_id: string; item_id: string; qty_delta: number }>(
    db,
    "SELECT ref_deal_id, item_id, qty_delta FROM inv_movements WHERE movement_type = 'SHIPMENT' AND ref_deal_id IS NOT NULL"
  );
  const items = await invListItems(true);
  const costById = new Map(items.map((i) => [i.id, Number(i.standard_cost ?? 0)]));
  const costByDeal = new Map<string, number>();
  for (const m of movements) {
    const c = (costByDeal.get(m.ref_deal_id) ?? 0) + Math.abs(m.qty_delta) * (costById.get(m.item_id) ?? 0);
    costByDeal.set(m.ref_deal_id, c);
  }
  return deals.map((d) => ({
    deal_id: d.id,
    title: d.title,
    value_zar: d.value_zar,
    est_cost: costByDeal.get(d.id) ?? 0,
  }));
}

type MovementSliceRow = { item_id: string; qty_delta: number; created_at: string };

export type InvProductSalesTimePreset = "all" | "day" | "week" | "month" | "3m" | "6m" | "12m" | "custom";

export type InvProductSalesTimeFilter =
  | { preset: "all" }
  | { preset: "day" | "week" | "month" | "3m" | "6m" | "12m" }
  | { preset: "custom"; from: string; to: string };

export type InvProductSalesResolvedWindow =
  | { mode: "all"; label: string }
  | { mode: "range"; fromInclusive: Date; untilExclusive: Date; label: string };

function parseYmdLocal(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

/**
 * Maps dashboard / report presets to half-open movement timestamps [fromInclusive, untilExclusive).
 */
export function resolveInvProductSalesWindow(
  filter: InvProductSalesTimeFilter,
  nowInput = new Date()
): InvProductSalesResolvedWindow {
  const now = nowInput;
  if (filter.preset === "all") {
    return { mode: "all", label: "All time" };
  }
  if (filter.preset === "custom") {
    let fromD = parseYmdLocal(filter.from);
    let toD = parseYmdLocal(filter.to);
    if (!fromD || !toD) return { mode: "all", label: "All time" };
    if (fromD.getTime() > toD.getTime()) {
      const t = fromD;
      fromD = toD;
      toD = t;
    }
    const fromInclusive = startOfDay(fromD);
    const untilExclusive = addDays(startOfDay(toD), 1);
    const label = `${format(fromInclusive, "d MMM yyyy")} – ${format(toD, "d MMM yyyy")}`;
    return { mode: "range", fromInclusive, untilExclusive, label };
  }

  const untilExclusive = addDays(startOfDay(now), 1);
  let fromInclusive: Date;
  let label: string;
  switch (filter.preset) {
    case "day":
      fromInclusive = startOfDay(now);
      label = `Today · ${format(now, "d MMM yyyy")}`;
      break;
    case "week":
      fromInclusive = startOfDay(subDays(now, 6));
      label = "Last 7 days";
      break;
    case "month":
      fromInclusive = startOfDay(subDays(now, 29));
      label = "Last 30 days";
      break;
    case "3m":
      fromInclusive = startOfDay(subDays(now, 89));
      label = "Last 90 days";
      break;
    case "6m":
      fromInclusive = startOfDay(subDays(now, 179));
      label = "Last 180 days";
      break;
    case "12m":
      fromInclusive = startOfDay(subDays(now, 364));
      label = "Last 12 months";
      break;
    default: {
      const _exhaustive: never = filter;
      return { mode: "all", label: "All time" };
    }
  }
  return { mode: "range", fromInclusive, untilExclusive, label };
}

async function fetchMovementsByType(
  movementType: InvMovementType,
  range?: { fromInclusive: Date; untilExclusive: Date }
): Promise<MovementSliceRow[]> {
  const fromIso = range?.fromInclusive.toISOString();
  const untilIso = range?.untilExclusive.toISOString();

  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const pageSize = 1000;
    let from = 0;
    const out: MovementSliceRow[] = [];
    for (;;) {
      let q = supabase
        .from("inv_movements")
        .select("item_id, qty_delta, created_at")
        .eq("movement_type", movementType)
        .order("created_at", { ascending: true });
      if (range) {
        q = q.gte("created_at", fromIso!).lt("created_at", untilIso!);
      }
      const { data, error } = await q.range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const chunk = (data as MovementSliceRow[]) ?? [];
      out.push(...chunk);
      if (chunk.length < pageSize) break;
      from += pageSize;
      if (from > 32000) break;
    }
    return out;
  }
  if (range) {
    // Compare with datetime() — raw created_at is often "YYYY-MM-DD HH:MM:SS" while bounds are ISO;
    // string compare between those formats is wrong (space vs "T").
    return dbAll<MovementSliceRow>(
      await getLocalSqliteDb(),
      `SELECT item_id, qty_delta, created_at FROM inv_movements
       WHERE movement_type = ?
         AND datetime(created_at) >= datetime(?)
         AND datetime(created_at) < datetime(?)`,
      [movementType, fromIso!, untilIso!]
    );
  }
  return dbAll<MovementSliceRow>(
    await getLocalSqliteDb(),
    "SELECT item_id, qty_delta, created_at FROM inv_movements WHERE movement_type = ?",
    [movementType]
  );
}

function aggregateMovementQty(
  rows: MovementSliceRow[],
  since?: Date,
  until?: Date
): Map<string, number> {
  const map = new Map<string, number>();
  const sinceT = since?.getTime();
  const untilT = until?.getTime();
  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    if (sinceT !== undefined && t < sinceT) continue;
    if (untilT !== undefined && t >= untilT) continue;
    const q = Math.abs(Number(r.qty_delta));
    map.set(r.item_id, (map.get(r.item_id) ?? 0) + q);
  }
  return map;
}

export type InvDashboardInsightRow = {
  item_id: string;
  sku: string;
  name: string;
  qty: number;
  /** vs prior 28d window; null if not applicable */
  deltaVsPriorPct: number | null;
};

export type InvDashboardProductInsights = {
  bestSelling: InvDashboardInsightRow[];
  trending: InvDashboardInsightRow[];
  /** How metrics were derived for empty-state / footnotes */
  basis: "shipments" | "production_output" | "empty";
};

/**
 * Dashboard merchandising: best-selling from lifetime shipped qty (or production receipts if no shipments).
 * Trending = last 28d shipped volume with % change vs previous 28d; falls back to steady sellers when quiet.
 */
export async function invDashboardProductInsights(): Promise<InvDashboardProductInsights> {
  let rows = await fetchMovementsByType("SHIPMENT");
  let basis: InvDashboardProductInsights["basis"] = "shipments";
  if (rows.length === 0) {
    rows = await fetchMovementsByType("PRODUCTION_RECEIPT");
    basis = rows.length ? "production_output" : "empty";
  }
  if (rows.length === 0) {
    return { bestSelling: [], trending: [], basis: "empty" };
  }

  const now = Date.now();
  const windowMs = 28 * 24 * 60 * 60 * 1000;
  const recentStart = new Date(now - windowMs);
  const priorStart = new Date(now - 2 * windowMs);
  const priorEnd = recentStart;

  const allMap = aggregateMovementQty(rows);
  const recentMap = aggregateMovementQty(rows, recentStart);
  const priorMap = aggregateMovementQty(rows, priorStart, priorEnd);

  const items = await invListItems(true);
  const byId = new Map(items.map((i) => [i.id, i]));

  function mapTop(map: Map<string, number>, limit: number): InvDashboardInsightRow[] {
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([item_id, qty]) => {
        const it = byId.get(item_id);
        return {
          item_id,
          sku: it?.sku ?? item_id.slice(0, 8),
          name: it?.name ?? "Unknown item",
          qty,
          deltaVsPriorPct: null,
        };
      });
  }

  const bestSelling = mapTop(allMap, 5);

  const scored = [...recentMap.entries()]
    .filter(([, q]) => q > 0)
    .map(([id, recentQ]) => {
      const priorQ = priorMap.get(id) ?? 0;
      const deltaVsPriorPct =
        priorQ > 0 ? Math.round(((recentQ - priorQ) / priorQ) * 100) : null;
      const momentum =
        priorQ <= 0 ? recentQ * 2 : recentQ * (1 + (recentQ - priorQ) / Math.max(priorQ, 0.001));
      return { id, recentQ, deltaVsPriorPct, momentum };
    })
    .sort((a, b) => b.momentum - a.momentum)
    .slice(0, 5);

  let trending: InvDashboardInsightRow[] = scored.map((t) => {
    const it = byId.get(t.id);
    return {
      item_id: t.id,
      sku: it?.sku ?? t.id.slice(0, 8),
      name: it?.name ?? "Unknown item",
      qty: t.recentQ,
      deltaVsPriorPct: t.deltaVsPriorPct,
    };
  });

  if (trending.length === 0) {
    trending = bestSelling.map((b) => ({ ...b, deltaVsPriorPct: null }));
  }

  return { bestSelling, trending, basis };
}

export type InvProductSaleRow = {
  item_id: string;
  sku: string;
  name: string;
  kind: InvItemKind;
  category: string;
  uom: string;
  standard_cost: number;
  list_price_zar: number;
  shipped_qty: number;
  production_output_qty: number;
  est_sales_zar: number;
  /** Baseline ~30d shipped qty target; scaled in UI by period length. */
  sales_target_qty: number | null;
  /** Baseline ~30d production output target; scaled in UI by period length. */
  production_target_qty: number | null;
};

export type InvProductSalesMetrics = {
  rows: InvProductSaleRow[];
  avgListPriceFinished: number | null;
  avgStandardCostActive: number | null;
  avgMarginPct: number | null;
  totalShippedQty: number;
  totalEstSalesZar: number;
  skusWithShipments: number;
  /** Human-readable period for shipped/production columns (e.g. Last 30 days). */
  periodLabel: string;
};

function meanPositive(nums: number[]): number | null {
  const xs = nums.filter((n) => Number.isFinite(n));
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Per-SKU movement totals and averages for pricing / sales views (shipments × list price; production output separate).
 * Shipments and production receipts respect `timeFilter`; catalog averages (list, cost, margin) stay item-wide.
 */
export async function invProductSalesMetrics(
  timeFilter: InvProductSalesTimeFilter = { preset: "all" }
): Promise<InvProductSalesMetrics> {
  const window = resolveInvProductSalesWindow(timeFilter);
  const rangeOpts =
    window.mode === "all"
      ? undefined
      : { fromInclusive: window.fromInclusive, untilExclusive: window.untilExclusive };
  const periodLabel = window.label;

  const items = await invListItems(true);
  const shipRows = await fetchMovementsByType("SHIPMENT", rangeOpts);
  const prodRows = await fetchMovementsByType("PRODUCTION_RECEIPT", rangeOpts);
  const shipMap = aggregateMovementQty(shipRows);
  const prodMap = aggregateMovementQty(prodRows);

  const rows: InvProductSaleRow[] = items.map((it) => {
    const shipped_qty = shipMap.get(it.id) ?? 0;
    const production_output_qty = prodMap.get(it.id) ?? 0;
    const list = Number(it.list_price_zar ?? 0);
    const est_sales_zar = Math.round(shipped_qty * list * 100) / 100;
    return {
      item_id: it.id,
      sku: it.sku,
      name: it.name,
      kind: it.kind,
      category: it.category,
      uom: it.uom,
      standard_cost: Number(it.standard_cost ?? 0),
      list_price_zar: list,
      shipped_qty,
      production_output_qty,
      est_sales_zar,
      sales_target_qty:
        it.sales_target_qty != null && Number(it.sales_target_qty) > 0
          ? Number(it.sales_target_qty)
          : null,
      production_target_qty:
        it.production_target_qty != null && Number(it.production_target_qty) > 0
          ? Number(it.production_target_qty)
          : null,
    };
  });

  const finishedWithList = items.filter((i) => i.kind === "finished" && Number(i.list_price_zar) > 0);
  const avgListPriceFinished = meanPositive(finishedWithList.map((i) => Number(i.list_price_zar)));

  const withCost = items.filter((i) => Number(i.standard_cost) > 0);
  const avgStandardCostActive = meanPositive(withCost.map((i) => Number(i.standard_cost)));

  const margins: number[] = [];
  for (const i of items) {
    const list = Number(i.list_price_zar ?? 0);
    const cost = Number(i.standard_cost ?? 0);
    if (list > 0) margins.push(((list - cost) / list) * 100);
  }
  const avgMarginPct = meanPositive(margins);

  let totalShippedQty = 0;
  let totalEstSalesZar = 0;
  let skusWithShipments = 0;
  for (const r of rows) {
    totalShippedQty += r.shipped_qty;
    totalEstSalesZar += r.est_sales_zar;
    if (r.shipped_qty > 0) skusWithShipments += 1;
  }
  totalEstSalesZar = Math.round(totalEstSalesZar * 100) / 100;

  return {
    rows,
    avgListPriceFinished,
    avgStandardCostActive,
    avgMarginPct,
    totalShippedQty,
    totalEstSalesZar,
    skusWithShipments,
    periodLabel,
  };
}

export type InvDashboardChartsData = {
  /** Shipped quantity by inventory category for the same period as product sales. */
  categoryShippedMix: { name: string; value: number }[];
  /** Trailing eight weeks: shipment qty by item kind (raw / wip / finished). */
  weeklyShippedByKind: { week: string; raw: number; wip: number; finished: number }[];
  /** Last seven days Mon–Sun: relative shipment intensity 0–100. */
  weekdayShipmentIntensity: { day: string; index: number }[];
  periodLabel: string;
  hasCategoryShipments: boolean;
};

/**
 * Recharts-friendly series derived from movement ledger (shipments).
 * Pass `metrics` to avoid a second full metrics query from the dashboard.
 */
export async function invDashboardChartsData(
  timeFilter: InvProductSalesTimeFilter,
  metrics?: InvProductSalesMetrics
): Promise<InvDashboardChartsData> {
  const m = metrics ?? (await invProductSalesMetrics(timeFilter));
  const catMap = new Map<string, number>();
  let shippedTotal = 0;
  for (const r of m.rows) {
    if (r.shipped_qty <= 0) continue;
    const c = String(r.category ?? "").trim() || "Uncategorized";
    catMap.set(c, (catMap.get(c) ?? 0) + r.shipped_qty);
    shippedTotal += r.shipped_qty;
  }
  const categoryShippedMix = [...catMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const items = await invListItems(true);
  const itemById = new Map(items.map((i) => [i.id, i]));
  const now = new Date();
  const endExclusive = addDays(startOfDay(now), 1);

  const startInclusive = startOfWeek(subWeeks(now, 7), { weekStartsOn: 1 });
  const shipHist = await fetchMovementsByType("SHIPMENT", {
    fromInclusive: startInclusive,
    untilExclusive: endExclusive,
  });

  type Wk = { key: number; label: string; raw: number; wip: number; finished: number };
  const weekBuckets: Wk[] = [];
  for (let i = 7; i >= 0; i--) {
    const ws = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    weekBuckets.push({
      key: ws.getTime(),
      label: format(ws, "d MMM ''yy"),
      raw: 0,
      wip: 0,
      finished: 0,
    });
  }
  const weekByKey = new Map(weekBuckets.map((b) => [b.key, b]));
  for (const row of shipHist) {
    const t = new Date(row.created_at);
    const ws = startOfWeek(t, { weekStartsOn: 1 });
    const b = weekByKey.get(ws.getTime());
    if (!b) continue;
    const it = itemById.get(row.item_id);
    if (!it) continue;
    const q = Math.abs(Number(row.qty_delta));
    if (it.kind === "raw") b.raw += q;
    else if (it.kind === "wip") b.wip += q;
    else b.finished += q;
  }
  const weeklyShippedByKind = weekBuckets.map((b) => ({
    week: b.label,
    raw: b.raw,
    wip: b.wip,
    finished: b.finished,
  }));

  const dayStart = startOfDay(subDays(now, 6));
  const dayShip = await fetchMovementsByType("SHIPMENT", {
    fromInclusive: dayStart,
    untilExclusive: endExclusive,
  });
  const dowQty = [0, 0, 0, 0, 0, 0, 0];
  for (const row of dayShip) {
    const dt = new Date(row.created_at);
    const idx = (dt.getDay() + 6) % 7;
    dowQty[idx] += Math.abs(Number(row.qty_delta));
  }
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const maxD = Math.max(...dowQty, 1);
  const weekdayShipmentIntensity = dayNames.map((day, i) => ({
    day,
    index: Math.round((dowQty[i] / maxD) * 100),
  }));

  return {
    categoryShippedMix,
    weeklyShippedByKind,
    weekdayShipmentIntensity,
    periodLabel: m.periodLabel,
    hasCategoryShipments: shippedTotal > 0,
  };
}

export type InvLotRow = {
  id: string;
  created_at: string;
  item_id: string;
  lot_code: string;
  qty: number;
  location_id: string | null;
  expires_on: string | null;
};

export async function invListLots(itemId?: string): Promise<InvLotRow[]> {
  if (!crmUsesSupabase()) return [];
  let q = getSupabase().from("inv_lots").select("*").order("lot_code");
  if (itemId) q = q.eq("item_id", itemId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as InvLotRow[]) ?? [];
}

export async function invSaveLot(
  row: Partial<InvLotRow> & { item_id: string; lot_code: string; qty: number },
  actor: CrmActor
): Promise<{ error: Error | null }> {
  try {
    assertWrite(actor);
    if (!crmUsesSupabase()) return { error: new Error("Lots require Supabase.") };
    const supabase = getSupabase();
    if (row.id) {
      const { error } = await supabase
        .from("inv_lots")
        .update({
          lot_code: row.lot_code,
          qty: row.qty,
          location_id: row.location_id ?? null,
          expires_on: row.expires_on ?? null,
        })
        .eq("id", row.id);
      return { error: error ? new Error(error.message) : null };
    }
    const { error } = await supabase.from("inv_lots").insert({
      item_id: row.item_id,
      lot_code: row.lot_code,
      qty: row.qty,
      location_id: row.location_id ?? null,
      expires_on: row.expires_on ?? null,
    });
    return { error: error ? new Error(error.message) : null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Save failed") };
  }
}

export async function invDeleteLot(id: string, actor: CrmActor): Promise<{ error: Error | null }> {
  try {
    assertWrite(actor);
    if (!crmUsesSupabase()) return { error: new Error("Lots require Supabase.") };
    const { error } = await getSupabase().from("inv_lots").delete().eq("id", id);
    return { error: error ? new Error(error.message) : null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Delete failed") };
  }
}

/** Items where sum(balance qty) < reorder_min (reorder_min > 0). */
export async function invItemsBelowReorderMin(): Promise<
  { item_id: string; sku: string; name: string; qty_total: number; reorder_min: number }[]
> {
  if (!crmUsesSupabase()) return [];
  const supabase = getSupabase();
  const { data: bal, error: e1 } = await supabase.from("inv_stock_balances").select("item_id, qty");
  if (e1) throw new Error(e1.message);
  const { data: items, error: e2 } = await supabase.from("inv_items").select("*").eq("is_active", true);
  if (e2) throw new Error(e2.message);
  const totals = new Map<string, number>();
  for (const r of bal ?? []) {
    totals.set(r.item_id, (totals.get(r.item_id) ?? 0) + Number(r.qty));
  }
  const list = (items as ItemRow[])
    .filter((i) => Number(i.reorder_min) > 0)
    .map((i) => ({
      item_id: i.id,
      sku: i.sku,
      name: i.name,
      qty_total: totals.get(i.id) ?? 0,
      reorder_min: Number(i.reorder_min),
    }))
    .filter((r) => r.qty_total < r.reorder_min)
    .sort((a, b) => a.qty_total / a.reorder_min - b.qty_total / b.reorder_min);
  return list;
}
