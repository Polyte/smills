import { useEffect, useState } from "react";
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
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add order line" : "Edit order line"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Creates a new line stored in this browser (spreadsheet ledger)."
              : "Updates this line and keeps comments and history."}
          </DialogDescription>
        </DialogHeader>

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
            <Input
              id="so-form-delivery-status"
              list="ledger-delivery-presets"
              value={form.deliveryStatus}
              onChange={(e) => setForm((f) => ({ ...f, deliveryStatus: e.target.value }))}
              placeholder="e.g. Delivered & Signed"
              className={fieldClass}
            />
            <datalist id="ledger-delivery-presets">
              {LEDGER_DELIVERY_STATUS_PRESETS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="so-form-desc">Description</Label>
            <Input
              id="so-form-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={fieldClass}
            />
          </div>
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

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={() => void submit()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
