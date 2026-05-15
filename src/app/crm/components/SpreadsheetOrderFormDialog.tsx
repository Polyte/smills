import { useEffect, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { cn } from "../../components/ui/utils";
import { Badge } from "../../components/ui/badge";
import type { ImportedOrderLine } from "../../../lib/crm/importedOrdersTypes";
import {
  SPREADSHEET_ORDER_STATUSES,
  spreadsheetStatusLabel,
  type SpreadsheetOrderRow,
  type SpreadsheetOrderStatus,
} from "../../../lib/crm/spreadsheetOrderTypes";
import { toast } from "sonner";
import { LEDGER_DELIVERY_STATUS_PRESETS } from "../../../lib/crm/ledgerDeliveryStatuses";

type Mode = "create" | "edit";

function emptyForm(): ImportedOrderLine & { orderStatus: SpreadsheetOrderStatus } {
  return {
    deliveryDate: null,
    orderDate: null,
    salesOrder: "",
    customer: "",
    itemCode: "",
    description: "",
    deliveryStatus: "",
    quantity: null,
    deliveredKgs: null,
    balance: null,
    grandTotal: null,
    orderStatus: "open",
  };
}

function rowToForm(row: SpreadsheetOrderRow): ImportedOrderLine & { orderStatus: SpreadsheetOrderStatus } {
  return {
    deliveryDate: row.deliveryDate,
    orderDate: row.orderDate,
    salesOrder: row.salesOrder,
    customer: row.customer,
    itemCode: row.itemCode,
    description: row.description,
    deliveryStatus: row.deliveryStatus,
    quantity: row.quantity,
    deliveredKgs: row.deliveredKgs,
    balance: row.balance,
    grandTotal: row.grandTotal,
    orderStatus: row.orderStatus,
  };
}

function parseNum(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  row: SpreadsheetOrderRow | null;
  onSave: (
    payload: ImportedOrderLine & { orderStatus: SpreadsheetOrderStatus },
    mode: Mode,
    rowId: string | null
  ) => Promise<void>;
};

const fieldClass =
  "min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

export function SpreadsheetOrderFormDialog({ open, onOpenChange, mode, row, onSave }: Props) {
  const [form, setForm] = useState(() => emptyForm());

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && row) {
      setForm(rowToForm(row));
    } else {
      setForm(emptyForm());
    }
  }, [open, mode, row]);

  async function submit() {
    const salesOrder = form.salesOrder.trim();
    const customer = form.customer.trim();
    if (!salesOrder || !customer) {
      toast.error("Sales order and customer are required.");
      return;
    }
    const payload: ImportedOrderLine & { orderStatus: SpreadsheetOrderStatus } = {
      deliveryDate: form.deliveryDate?.trim() || null,
      orderDate: form.orderDate?.trim() || null,
      salesOrder,
      customer,
      itemCode: form.itemCode.trim(),
      description: form.description.trim(),
      deliveryStatus: form.deliveryStatus.trim(),
      quantity: form.quantity,
      deliveredKgs: form.deliveredKgs,
      balance: form.balance,
      grandTotal: form.grandTotal,
      orderStatus: form.orderStatus,
    };
    try {
      await onSave(payload, mode, row?.id ?? null);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-2xl p-0 gap-0">
        <DialogHeader className="relative isolate overflow-hidden rounded-t-2xl border-b border-border/60 bg-gradient-to-r from-muted/30 to-muted/10 px-6 pb-4 pt-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[oklch(0.55_0.15_48)] via-[oklch(0.72_0.14_82)] via-60% to-[oklch(0.55_0.15_300)]" />
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/60 bg-amber-50 shadow-sm">
              <FileSpreadsheet className="size-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {mode === "create" ? "Add order line" : "Edit order line"}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm">
                {mode === "create"
                  ? "Create a new line in the spreadsheet sales ledger."
                  : "Update this line — comments and history are preserved."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order details</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="so-form-order-date">Order date</Label>
            <Input
              id="so-form-order-date"
              type="date"
              value={form.orderDate ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value || null }))}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="so-form-delivery-date">Delivery date</Label>
            <Input
              id="so-form-delivery-date"
              type="date"
              value={form.deliveryDate ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, deliveryDate: e.target.value || null }))}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="so-form-so">Sales order *</Label>
            <Input
              id="so-form-so"
              value={form.salesOrder}
              onChange={(e) => setForm((f) => ({ ...f, salesOrder: e.target.value }))}
              className={fieldClass}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="so-form-customer">Customer *</Label>
            <Input
              id="so-form-customer"
              value={form.customer}
              onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))}
              className={fieldClass}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="so-form-item">Item code</Label>
            <Input
              id="so-form-item"
              value={form.itemCode}
              onChange={(e) => setForm((f) => ({ ...f, itemCode: e.target.value }))}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="so-form-delivery-status">Delivery status</Label>
            <Select
              value={form.deliveryStatus}
              onValueChange={(v) => setForm((f) => ({ ...f, deliveryStatus: v }))}
            >
              <SelectTrigger id="so-form-delivery-status" className={fieldClass}>
                <SelectValue placeholder="Select status…" />
              </SelectTrigger>
              <SelectContent>
                {LEDGER_DELIVERY_STATUS_PRESETS.map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className={cn(
                      p.toLowerCase().includes("deliver") && "text-emerald-600",
                      p.toLowerCase().includes("cancel") && "text-rose-500",
                      p.toLowerCase().includes("progress") && "text-amber-600"
                    )}>
                      {p}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="so-form-desc">Description</Label>
            <Input
              id="so-form-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={fieldClass}
              placeholder="Item or order description"
            />
          </div>
        </div>

        <h4 className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quantities & financials
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="so-form-qty">Quantity</Label>
            <Input
              id="so-form-qty"
              type="number"
              inputMode="decimal"
              value={form.quantity ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, quantity: parseNum(e.target.value) }))}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="so-form-delivered">Delivered kg</Label>
            <Input
              id="so-form-delivered"
              type="number"
              inputMode="decimal"
              value={form.deliveredKgs ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, deliveredKgs: parseNum(e.target.value) }))}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="so-form-balance">Balance</Label>
            <Input
              id="so-form-balance"
              type="number"
              inputMode="decimal"
              value={form.balance ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, balance: parseNum(e.target.value) }))}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="so-form-grand">Grand total</Label>
            <Input
              id="so-form-grand"
              type="number"
              inputMode="decimal"
              value={form.grandTotal ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, grandTotal: parseNum(e.target.value) }))}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="so-form-workflow">Order status</Label>
            <Select
              value={form.orderStatus}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, orderStatus: v as SpreadsheetOrderStatus }))
              }
            >
              <SelectTrigger id="so-form-workflow" className={fieldClass}>
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
          </div>
        </div>
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/10 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="h-10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => void submit()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
