import { Link } from "react-router";
import { ArrowLeft, Cloud, Database } from "lucide-react";
import { Button } from "../../components/ui/button";
import { SpreadsheetOrdersProvider, useSpreadsheetOrders } from "../context/SpreadsheetOrdersContext";
import { SpreadsheetSalesLeaderCharts } from "../components/SpreadsheetSalesLeaderCharts";
import { LedgerExportToolbar } from "../components/LedgerExportToolbar";
import { ImportedOrderLinesPanel } from "../components/ImportedOrderLinesPanel";

/**
 * Dedicated sales ledger (spreadsheet import) with Supabase sync when configured,
 * supervisor charts, and exports.
 */
export default function SpreadsheetSalesOrdersPage() {
  return (
    <SpreadsheetOrdersProvider>
      <SpreadsheetSalesOrdersPageInner />
    </SpreadsheetOrdersProvider>
  );
}

function SpreadsheetSalesOrdersPageInner() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 -ml-2 min-h-[44px] w-fit gap-2 text-muted-foreground transition-all duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            asChild
          >
            <Link to="/crm/orders">
              <ArrowLeft className="size-4" />
              Factory orders
            </Link>
          </Button>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Spreadsheet sales orders
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Imported line items with filters, workflow status, comments, and exports. Data syncs to Supabase when
            the app is configured for cloud CRM; otherwise it stays in this browser.
          </p>
          <LedgerStorageHint />
        </div>
      </div>

      <LedgerExportToolbar />
      <SpreadsheetSalesLeaderCharts />
      <ImportedOrderLinesPanel />
    </div>
  );
}

function LedgerStorageHint() {
  const { usesCloud } = useSpreadsheetOrders();
  return (
    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors duration-200 ${
          usesCloud
            ? "border-primary/30 bg-primary/10 text-foreground"
            : "border-border/80 bg-muted/40"
        }`}
      >
        <Cloud className="size-3.5 opacity-80" />
        {usesCloud ? "Live: Supabase" : "Cloud: not configured"}
      </span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors duration-200 ${
          !usesCloud
            ? "border-primary/30 bg-primary/10 text-foreground"
            : "border-border/80 bg-muted/40"
        }`}
      >
        <Database className="size-3.5 opacity-80" />
        {!usesCloud ? "Active: this browser" : "Fallback available offline"}
      </span>
    </div>
  );
}
