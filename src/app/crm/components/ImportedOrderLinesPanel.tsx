import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { useSpreadsheetOrders } from "../context/SpreadsheetOrdersContext";
import {
  computeGrandTotalStats,
  computeTopItemByMonth,
} from "../../../lib/crm/spreadsheetOrdersAnalytics";
import {
  SPREADSHEET_ORDER_STATUSES,
  spreadsheetStatusLabel,
  type SpreadsheetOrderRow,
  type SpreadsheetOrderStatus,
} from "../../../lib/crm/spreadsheetOrderTypes";
import { SpreadsheetOrderFormDialog } from "./SpreadsheetOrderFormDialog";
import { SpreadsheetOrderCommentsDialog } from "./SpreadsheetOrderCommentsDialog";
import { LEDGER_DELIVERY_STATUS_PRESETS } from "../../../lib/crm/ledgerDeliveryStatuses";

const ALL = "__all__";
const PAGE_SIZE = 20;

const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

function sortedUnique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

function inDateRange(value: string | null, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!value) return false;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}

export function ImportedOrderLinesPanel() {
  const {
    rows,
    ready,
    loading,
    error,
    usesCloud,
    refresh,
    addRow,
    updateRow,
    deleteRow,
    addComment,
    resetToSeed,
  } = useSpreadsheetOrders();

  const [customer, setCustomer] = useState(ALL);
  const [deliveryStatus, setDeliveryStatus] = useState(ALL);
  const [orderWorkflow, setOrderWorkflow] = useState(ALL);
  const [itemCode, setItemCode] = useState(ALL);
  const [salesOrder, setSalesOrder] = useState(ALL);
  const [description, setDescription] = useState("");
  const [orderDateFrom, setOrderDateFrom] = useState("");
  const [orderDateTo, setOrderDateTo] = useState("");
  const [deliveryDateFrom, setDeliveryDateFrom] = useState("");
  const [deliveryDateTo, setDeliveryDateTo] = useState("");
  const [quantityMin, setQuantityMin] = useState("");
  const [quantityMax, setQuantityMax] = useState("");
  const [grandTotalMin, setGrandTotalMin] = useState("");
  const [grandTotalMax, setGrandTotalMax] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formRow, setFormRow] = useState<SpreadsheetOrderRow | null>(null);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsRow, setCommentsRow] = useState<SpreadsheetOrderRow | null>(null);

  const commentsRowLive = useMemo(() => {
    if (!commentsRow) return null;
    return rows.find((r) => r.id === commentsRow.id) ?? commentsRow;
  }, [commentsRow, rows]);

  const [deleteTarget, setDeleteTarget] = useState<SpreadsheetOrderRow | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [page, setPage] = useState(1);

  const customers = useMemo(() => sortedUnique(rows.map((r) => r.customer)), [rows]);
  const deliveryStatuses = useMemo(
    () => sortedUnique([...LEDGER_DELIVERY_STATUS_PRESETS, ...rows.map((r) => r.deliveryStatus)]),
    [rows]
  );
  const itemCodes = useMemo(() => sortedUnique(rows.map((r) => r.itemCode)), [rows]);
  const salesOrders = useMemo(() => sortedUnique(rows.map((r) => r.salesOrder)), [rows]);

  const statsAll = useMemo(() => computeGrandTotalStats(rows), [rows]);
  const topByMonth = useMemo(() => computeTopItemByMonth(rows), [rows]);

  const filtered = useMemo(() => {
    const descQ = description.trim().toLowerCase();
    const qMin = quantityMin.trim() === "" ? null : Number(quantityMin);
    const qMax = quantityMax.trim() === "" ? null : Number(quantityMax);
    const gtMin = grandTotalMin.trim() === "" ? null : Number(grandTotalMin);
    const gtMax = grandTotalMax.trim() === "" ? null : Number(grandTotalMax);

    return rows.filter((row) => {
      if (customer !== ALL && row.customer !== customer) return false;
      if (deliveryStatus !== ALL && row.deliveryStatus !== deliveryStatus) return false;
      if (orderWorkflow !== ALL && row.orderStatus !== orderWorkflow) return false;
      if (itemCode !== ALL && row.itemCode !== itemCode) return false;
      if (salesOrder !== ALL && row.salesOrder !== salesOrder) return false;
      if (descQ && !row.description.toLowerCase().includes(descQ)) return false;
      if (!inDateRange(row.orderDate, orderDateFrom, orderDateTo)) return false;
      if (!inDateRange(row.deliveryDate, deliveryDateFrom, deliveryDateTo)) return false;
      if (qMin != null && !Number.isNaN(qMin) && (row.quantity == null || row.quantity < qMin)) return false;
      if (qMax != null && !Number.isNaN(qMax) && (row.quantity == null || row.quantity > qMax)) return false;
      if (gtMin != null && !Number.isNaN(gtMin) && (row.grandTotal == null || row.grandTotal < gtMin)) return false;
      if (gtMax != null && !Number.isNaN(gtMax) && (row.grandTotal == null || row.grandTotal > gtMax)) return false;
      return true;
    });
  }, [
    rows,
    customer,
    deliveryStatus,
    orderWorkflow,
    itemCode,
    salesOrder,
    description,
    orderDateFrom,
    orderDateTo,
    deliveryDateFrom,
    deliveryDateTo,
    quantityMin,
    quantityMax,
    grandTotalMin,
    grandTotalMax,
  ]);

  const statsFiltered = useMemo(() => computeGrandTotalStats(filtered), [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginatedRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  useEffect(() => {
    setPage(1);
  }, [
    customer,
    deliveryStatus,
    orderWorkflow,
    itemCode,
    salesOrder,
    description,
    orderDateFrom,
    orderDateTo,
    deliveryDateFrom,
    deliveryDateTo,
    quantityMin,
    quantityMax,
    grandTotalMin,
    grandTotalMax,
  ]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  function clearFilters() {
    setPage(1);
    setCustomer(ALL);
    setDeliveryStatus(ALL);
    setOrderWorkflow(ALL);
    setItemCode(ALL);
    setSalesOrder(ALL);
    setDescription("");
    setOrderDateFrom("");
    setOrderDateTo("");
    setDeliveryDateFrom("");
    setDeliveryDateTo("");
    setQuantityMin("");
    setQuantityMax("");
    setGrandTotalMin("");
    setGrandTotalMax("");
  }

  const selectTriggerClass =
    "min-h-[44px] w-full transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

  const workflowSelectClass =
    "h-9 min-h-[36px] max-w-[140px] text-xs transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

  if (!ready) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl md:col-span-2 xl:col-span-2" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
        {loading ? <p className="text-center text-sm text-muted-foreground">Loading ledger…</p> : null}
      </div>
    );
  }

  if (error && rows.length === 0) {
    return (
      <Card className="rounded-2xl border-destructive/40 shadow-md">
        <CardHeader>
          <CardTitle className="text-destructive">Could not load sales ledger</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            className="min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={() => void refresh()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  function openCreate() {
    setFormMode("create");
    setFormRow(null);
    setFormOpen(true);
  }

  function openEdit(row: SpreadsheetOrderRow) {
    setFormMode("edit");
    setFormRow(row);
    setFormOpen(true);
  }

  function openComments(row: SpreadsheetOrderRow) {
    setCommentsRow(row);
    setCommentsOpen(true);
  }

  async function handleFormSave(
    payload: Parameters<typeof addRow>[0],
    mode: "create" | "edit",
    rowId: string | null
  ) {
    if (mode === "create") {
      await addRow(payload);
      toast.success("Order line added");
    } else if (rowId) {
      await updateRow(rowId, payload);
      toast.success("Order line updated");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteRow(deleteTarget.id);
      toast.success("Order line removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
    setDeleteTarget(null);
  }

  function confirmReset() {
    resetToSeed();
    toast.success("Spreadsheet lines reset to imported file");
    setResetOpen(false);
    clearFilters();
  }

  return (
    <div className="space-y-4">
      {error && rows.length > 0 ? (
        <Alert variant="destructive" className="rounded-2xl border-destructive/50">
          <AlertTitle>Sync issue</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{error}</span>
            <Button type="button" size="sm" variant="outline" className="min-h-9" onClick={() => void refresh()}>
              Refresh
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-border/70 bg-card/80 shadow-sm backdrop-blur-[1px] transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total (all lines)</CardTitle>
            <CardDescription className="text-xs">Sum of grand total across every line</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums tracking-tight">{nf.format(statsAll.sum)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {statsAll.count} lines with a value · Avg {statsAll.average != null ? nf.format(statsAll.average) : "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/80 shadow-sm backdrop-blur-[1px] transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Filtered view</CardTitle>
            <CardDescription className="text-xs">Totals for rows matching current filters</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums tracking-tight">{nf.format(statsFiltered.sum)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {filtered.length} rows · Avg{" "}
              {statsFiltered.average != null ? nf.format(statsFiltered.average) : "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/80 shadow-sm backdrop-blur-[1px] transition-all duration-200 hover:shadow-md md:col-span-2 xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Most bought item by month</CardTitle>
            <CardDescription className="text-xs">
              By order date month — item with highest total quantity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topByMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dated quantities to analyse.</p>
            ) : (
              <ul className="max-h-36 space-y-2 overflow-y-auto text-sm">
                {topByMonth.map((m) => (
                  <li
                    key={m.month}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="font-medium">{m.monthLabel}</span>
                    <span className="text-right text-muted-foreground">
                      <span className="font-mono text-foreground">{m.itemCode}</span>
                      {" · "}
                      <span className="tabular-nums">{nf.format(m.totalQuantity)}</span> qty
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/70 shadow-md transition-shadow duration-200 hover:shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>
                {rows.length} lines in ledger. Showing {filtered.length} after filters.
                {usesCloud ? " Synced with Supabase." : " Stored in this browser."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
              {!usesCloud ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] gap-1 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  onClick={() => setResetOpen(true)}
                >
                  <RotateCcw className="size-4" />
                  Reset to import
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="min-h-[44px] gap-1 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                onClick={() => openCreate()}
              >
                <Plus className="size-4" />
                Add line
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="imp-customer">Customer</Label>
              <Select value={customer} onValueChange={setCustomer}>
                <SelectTrigger id="imp-customer" className={selectTriggerClass}>
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All customers</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imp-workflow">Order status</Label>
              <Select value={orderWorkflow} onValueChange={setOrderWorkflow}>
                <SelectTrigger id="imp-workflow" className={selectTriggerClass}>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  {SPREADSHEET_ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {spreadsheetStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imp-status">Delivery status</Label>
              <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
                <SelectTrigger id="imp-status" className={selectTriggerClass}>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  {deliveryStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imp-so">Sales order</Label>
              <Select value={salesOrder} onValueChange={setSalesOrder}>
                <SelectTrigger id="imp-so" className={selectTriggerClass}>
                  <SelectValue placeholder="All orders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All orders</SelectItem>
                  {salesOrders.map((so) => (
                    <SelectItem key={so} value={so}>
                      {so}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imp-item">Item code</Label>
              <Select value={itemCode} onValueChange={setItemCode}>
                <SelectTrigger id="imp-item" className={selectTriggerClass}>
                  <SelectValue placeholder="All items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All items</SelectItem>
                  {itemCodes.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="imp-desc">Description contains</Label>
              <Input
                id="imp-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Search description…"
                className="min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imp-od-from">Order date from</Label>
              <Input
                id="imp-od-from"
                type="date"
                value={orderDateFrom}
                onChange={(e) => setOrderDateFrom(e.target.value)}
                className="min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imp-od-to">Order date to</Label>
              <Input
                id="imp-od-to"
                type="date"
                value={orderDateTo}
                onChange={(e) => setOrderDateTo(e.target.value)}
                className="min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imp-dd-from">Delivery date from</Label>
              <Input
                id="imp-dd-from"
                type="date"
                value={deliveryDateFrom}
                onChange={(e) => setDeliveryDateFrom(e.target.value)}
                className="min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imp-dd-to">Delivery date to</Label>
              <Input
                id="imp-dd-to"
                type="date"
                value={deliveryDateTo}
                onChange={(e) => setDeliveryDateTo(e.target.value)}
                className="min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imp-qty-min">Quantity min</Label>
              <Input
                id="imp-qty-min"
                type="number"
                inputMode="decimal"
                value={quantityMin}
                onChange={(e) => setQuantityMin(e.target.value)}
                placeholder="Any"
                className="min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imp-qty-max">Quantity max</Label>
              <Input
                id="imp-qty-max"
                type="number"
                inputMode="decimal"
                value={quantityMax}
                onChange={(e) => setQuantityMax(e.target.value)}
                placeholder="Any"
                className="min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imp-gt-min">Grand total min</Label>
              <Input
                id="imp-gt-min"
                type="number"
                inputMode="decimal"
                value={grandTotalMin}
                onChange={(e) => setGrandTotalMin(e.target.value)}
                placeholder="Any"
                className="min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imp-gt-max">Grand total max</Label>
              <Input
                id="imp-gt-max"
                type="number"
                inputMode="decimal"
                value={grandTotalMax}
                onChange={(e) => setGrandTotalMax(e.target.value)}
                placeholder="Any"
                className="min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70 shadow-md transition-shadow duration-200 hover:shadow-lg">
        <CardHeader className="flex flex-col gap-2 border-b border-border/50 bg-muted/20 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">Spreadsheet order lines</CardTitle>
            <CardDescription className="mt-1">
              CRUD, comments, and workflow status
              {usesCloud ? " persist in Supabase." : " persist in local storage for this browser."} Showing{" "}
              {PAGE_SIZE} rows per page.
            </CardDescription>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            {filtered.length === 0 ? (
              "No rows match filters"
            ) : (
              <>
                <span className="font-medium text-foreground">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
                </span>
                {" of "}
                <span className="font-medium text-foreground">{filtered.length}</span>
                {" · Page "}
                <span className="font-medium text-foreground">
                  {page}/{totalPages}
                </span>
              </>
            )}
          </p>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="w-full overflow-x-auto rounded-xl border border-border/60 bg-card/50 md:mx-0 md:rounded-t-none md:border-t-0 md:bg-transparent">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 bg-muted/80 hover:bg-muted/80 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
                  <TableHead>Order status</TableHead>
                  <TableHead>Order date</TableHead>
                  <TableHead>Delivery date</TableHead>
                  <TableHead>SO</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="min-w-[220px]">Description</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Delivered kg</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Grand total</TableHead>
                  <TableHead className="w-[100px]">Notes</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-border/40 transition-colors duration-150 hover:bg-muted/45 even:bg-muted/15"
                  >
                    <TableCell className="align-top">
                      <Select
                        value={row.orderStatus}
                        onValueChange={(v) => {
                          void updateRow(row.id, { orderStatus: v as SpreadsheetOrderStatus }).catch((e) =>
                            toast.error(e instanceof Error ? e.message : "Update failed")
                          );
                        }}
                      >
                        <SelectTrigger className={workflowSelectClass} aria-label="Order status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SPREADSHEET_ORDER_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {spreadsheetStatusLabel(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="font-mono text-xs align-top">{row.orderDate ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs align-top">{row.deliveryDate ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs align-top">{row.salesOrder}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm align-top" title={row.customer}>
                      {row.customer}
                    </TableCell>
                    <TableCell className="font-mono text-xs align-top">{row.itemCode}</TableCell>
                    <TableCell
                      className="max-w-[280px] text-sm whitespace-normal align-top"
                      title={row.description}
                    >
                      {row.description}
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant="secondary" className="font-normal">
                        {row.deliveryStatus || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm align-top">
                      {row.quantity != null ? nf.format(row.quantity) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm align-top">
                      {row.deliveredKgs != null ? nf.format(row.deliveredKgs) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm align-top">
                      {row.balance != null ? nf.format(row.balance) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm align-top">
                      {row.grandTotal != null ? nf.format(row.grandTotal) : "—"}
                    </TableCell>
                    <TableCell className="align-top">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-[44px] min-w-[44px] gap-1 px-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        onClick={() => openComments(row)}
                        aria-label={`Comments for ${row.salesOrder}`}
                      >
                        <MessageSquare className="size-4" />
                        {row.comments.length > 0 ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {row.comments.length}
                          </Badge>
                        ) : null}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11 min-h-[44px] min-w-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          aria-label={`Edit ${row.salesOrder}`}
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11 min-h-[44px] min-w-[44px] text-destructive hover:text-destructive transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          aria-label={`Delete ${row.salesOrder}`}
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 ? (
            <div className="flex flex-col gap-4 border-t border-border/60 bg-gradient-to-r from-muted/30 via-muted/15 to-transparent px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-center text-sm text-muted-foreground sm:text-left">
                Use pagination to browse large result sets · <span className="font-medium text-foreground">{PAGE_SIZE}</span>{" "}
                lines per page
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  className="min-h-[44px] gap-1 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Select value={String(page)} onValueChange={(v) => setPage(Number(v))}>
                  <SelectTrigger
                    aria-label="Go to page"
                    className="h-11 w-[min(100vw-8rem,200px)] min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <SelectValue placeholder="Page" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        Page {i + 1} of {totalPages}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  className="min-h-[44px] gap-1 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : filtered.length > 0 ? (
            <div className="border-t border-border/60 bg-muted/10 px-4 py-3 text-center text-sm text-muted-foreground">
              Showing all <span className="font-medium text-foreground">{filtered.length}</span> matching rows on
              one page
            </div>
          ) : null}
        </CardContent>
      </Card>

      <SpreadsheetOrderFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        row={formRow}
        onSave={handleFormSave}
      />

      <SpreadsheetOrderCommentsDialog
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        row={commentsRowLive}
        onAddComment={addComment}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this line?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  This removes <span className="font-mono">{deleteTarget.salesOrder}</span> from the ledger in
                  this browser. Comments are removed with the line.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px] transition-all duration-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-[44px] transition-all duration-200"
              onClick={() => void confirmDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset spreadsheet lines?</AlertDialogTitle>
            <AlertDialogDescription>
              Reloads rows from the built-in import, clears manual lines, comments, and status changes stored in
              this browser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px] transition-all duration-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-[44px] transition-all duration-200"
              onClick={() => void confirmReset()}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
