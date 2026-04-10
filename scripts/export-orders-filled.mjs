/**
 * Regenerates src/data/ordersFilled.json from Orders_filled.xlsx.
 * Run from repo root: node scripts/export-orders-filled.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function isoDate(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

const xlsxPath = path.join(root, "Orders_filled.xlsx");
const wb = XLSX.readFile(xlsxPath, { cellDates: true });
const rows = XLSX.utils.sheet_to_json(wb.Sheets["Sheet1"], { defval: null });

const out = [];
for (const r of rows) {
  const name = r.Name != null && String(r.Name).trim();
  if (!name) continue;
  out.push({
    deliveryDate: isoDate(r.DeliveryDate),
    orderDate: isoDate(r.OrderDate),
    salesOrder: String(r.Name).trim(),
    customer: String(r.Customer ?? "").trim(),
    itemCode: String(r["Item Code"] ?? "").trim(),
    description: String(r.Description ?? "").trim(),
    deliveryStatus: String(r["Delivery Status"] ?? "").trim(),
    quantity: typeof r.Quantity === "number" ? r.Quantity : Number(r.Quantity) || null,
    deliveredKgs: typeof r["Delivered Kgs"] === "number" ? r["Delivered Kgs"] : Number(r["Delivered Kgs"]) || null,
    balance: typeof r.Balance === "number" ? r.Balance : Number(r.Balance) || null,
    grandTotal: typeof r["Grand Total"] === "number" ? r["Grand Total"] : Number(r["Grand Total"]) || null,
  });
}

const outPath = path.join(root, "src", "data", "ordersFilled.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${out.length} rows to ${path.relative(root, outPath)}`);
