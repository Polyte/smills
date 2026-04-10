import type { SpreadsheetOrderRow } from "./spreadsheetOrderTypes";
import { spreadsheetStatusLabel } from "./spreadsheetOrderTypes";
import {
  deliveryStatusBreakdown,
  revenueByOrderMonth,
  topCustomersByGrandTotal,
} from "./spreadsheetOrdersChartData";
import { computeGrandTotalStats } from "./spreadsheetOrdersAnalytics";

function rowToExportCells(r: SpreadsheetOrderRow): (string | number)[] {
  return [
    r.orderDate ?? "",
    r.deliveryDate ?? "",
    r.salesOrder,
    r.customer,
    r.itemCode,
    r.description,
    r.deliveryStatus,
    spreadsheetStatusLabel(r.orderStatus),
    r.quantity ?? "",
    r.deliveredKgs ?? "",
    r.balance ?? "",
    r.grandTotal ?? "",
    r.comments.length,
  ];
}

const HEADERS = [
  "Order date",
  "Delivery date",
  "SO",
  "Customer",
  "Item",
  "Description",
  "Delivery status",
  "Order status",
  "Qty",
  "Delivered kg",
  "Balance",
  "Grand total",
  "Comment count",
];

export async function exportSalesLedgerExcel(opts: {
  rows: SpreadsheetOrderRow[];
  chartRoot: HTMLElement | null;
  fileBaseName?: string;
}): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const html2canvas = (await import("html2canvas")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Standerton Mills CRM";
  wb.created = new Date();

  const ws = wb.addWorksheet("Lines", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.addRow(HEADERS);
  ws.getRow(1).font = { bold: true };
  for (const r of opts.rows) {
    ws.addRow(rowToExportCells(r));
  }
  ws.columns.forEach((col) => {
    col.width = 14;
  });

  const stats = computeGrandTotalStats(opts.rows);
  const rev = revenueByOrderMonth(opts.rows);
  const status = deliveryStatusBreakdown(opts.rows);
  const customers = topCustomersByGrandTotal(opts.rows, 10);

  const m = wb.addWorksheet("Metrics");
  m.addRow(["Sales ledger export", new Date().toISOString()]);
  m.addRow([]);
  m.addRow(["Lines", opts.rows.length]);
  m.addRow(["Sum grand total", stats.sum]);
  m.addRow(["Average line (grand total)", stats.average ?? ""]);
  m.addRow(["Lines with value", stats.count]);
  m.addRow([]);
  m.addRow(["Revenue by order month"]);
  m.addRow(["Month", "Total"]);
  for (const p of rev) {
    m.addRow([p.label, p.total]);
  }
  m.addRow([]);
  m.addRow(["Lines by delivery status"]);
  m.addRow(["Status", "Count"]);
  for (const s of status) {
    m.addRow([s.name, s.value]);
  }
  m.addRow([]);
  m.addRow(["Top customers by grand total"]);
  m.addRow(["Customer", "Total"]);
  for (const c of customers) {
    m.addRow([c.customer, c.total]);
  }

  if (opts.chartRoot && opts.chartRoot.offsetWidth > 0) {
    try {
      const canvas = await html2canvas(opts.chartRoot, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      const wbAny = wb as {
        addImage: (o: { base64: string; extension: "png" }) => number;
      };
      const imgId = wbAny.addImage({
        base64,
        extension: "png",
      });
      const viz = wb.addWorksheet("Charts snapshot");
      (viz as { addImage: (id: number, pos: object) => void }).addImage(imgId, {
        tl: { col: 0, row: 0 },
        ext: { width: Math.min(canvas.width, 900), height: Math.min(canvas.height, 480) },
      });
    } catch {
      /* charts sheet optional */
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const name = `${opts.fileBaseName ?? "sales-ledger"}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  triggerDownload(blob, name);
}

export async function exportSalesLedgerPdf(opts: {
  rows: SpreadsheetOrderRow[];
  chartRoot: HTMLElement | null;
  fileBaseName?: string;
}): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const html2canvas = (await import("html2canvas")).default;

  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 36;
  let y = margin;

  pdf.setFontSize(14);
  pdf.text("Sales ledger — summary & charts", margin, y);
  y += 22;
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  pdf.text(`Generated ${new Date().toLocaleString()} · ${opts.rows.length} lines`, margin, y);
  y += 16;
  pdf.setTextColor(0);

  if (opts.chartRoot && opts.chartRoot.offsetWidth > 0) {
    try {
      const canvas = await html2canvas(opts.chartRoot, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height / canvas.width) * imgW;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, y, imgW, Math.min(imgH, 280));
      y += Math.min(imgH, 280) + 20;
    } catch {
      pdf.text("(Charts could not be rendered for PDF.)", margin, y);
      y += 18;
    }
  }

  const stats = computeGrandTotalStats(opts.rows);
  pdf.setFontSize(10);
  pdf.text(
    `Total grand total: ${stats.sum.toFixed(2)} · Average: ${stats.average != null ? stats.average.toFixed(2) : "—"} · Lines with value: ${stats.count}`,
    margin,
    y
  );
  y += 28;

  pdf.addPage();
  autoTable(pdf, {
    startY: margin,
    head: [HEADERS],
    body: opts.rows.map((r) => rowToExportCells(r).map((c) => (c === "" ? "—" : String(c)))),
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [41, 98, 255] },
    margin: { left: margin, right: margin },
  });

  const name = `${opts.fileBaseName ?? "sales-ledger"}-${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(name);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
