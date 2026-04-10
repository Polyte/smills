import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { exportSalesLedgerExcel, exportSalesLedgerPdf } from "../../../lib/crm/ledgerExports";
import { useSpreadsheetOrders } from "../context/SpreadsheetOrdersContext";

export function LedgerExportToolbar() {
  const { rows } = useSpreadsheetOrders();
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);

  async function run(kind: "xlsx" | "pdf") {
    const chartRoot = document.getElementById("ledger-export-charts");
    const exportRows = rows;
    if (exportRows.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    setBusy(kind);
    try {
      if (kind === "xlsx") {
        await exportSalesLedgerExcel({ rows: exportRows, chartRoot });
        toast.success("Excel downloaded");
      } else {
        await exportSalesLedgerPdf({ rows: exportRows, chartRoot });
        toast.success("PDF downloaded");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background shadow-md transition-shadow duration-200 hover:shadow-lg">
      <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Exports</CardTitle>
          <CardDescription>
            Excel and PDF include line data, metrics tables, and a snapshot of supervisor charts when visible.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px] gap-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            disabled={busy !== null}
            onClick={() => void run("xlsx")}
          >
            {busy === "xlsx" ? (
              "Working…"
            ) : (
              <>
                <FileSpreadsheet className="size-4" />
                Excel
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            className="min-h-[44px] gap-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            disabled={busy !== null}
            onClick={() => void run("pdf")}
          >
            {busy === "pdf" ? (
              "Working…"
            ) : (
              <>
                <FileText className="size-4" />
                PDF
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex items-center gap-2 pt-0 text-xs text-muted-foreground">
        <Download className="size-3.5 shrink-0 opacity-70" />
        <span>
          Charts are captured from the dashboard section below. Sales roles see data exports without the chart
          block — metrics sheets still include summary tables.
        </span>
      </CardContent>
    </Card>
  );
}
