import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { crmUsesSupabase } from "../../../lib/crm/crmRepo";
import type { CrmActor } from "../../../lib/crm/crmRepo";
import {
  invDeleteLot,
  invListItems,
  invListLocations,
  invListLots,
  invSaveLot,
  type InvLotRow,
} from "../../../lib/crm/inventoryRepo";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database } from "../database.types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type ItemRow = Database["public"]["Tables"]["inv_items"]["Row"];
type LocRow = Database["public"]["Tables"]["inv_locations"]["Row"];

const emptyLot = {
  lot_code: "",
  qty: "0",
  item_id: "",
  location_id: "" as string,
  expires_on: "" as string,
};

export function LotsPage() {
  const { user, profile } = useCrmAuth();
  const [lots, setLots] = useState<InvLotRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [locations, setLocations] = useState<LocRow[]>([]);
  const [filterItemId, setFilterItemId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InvLotRow | null>(null);
  const [form, setForm] = useState(emptyLot);
  const [deleteTarget, setDeleteTarget] = useState<InvLotRow | null>(null);

  const actor: CrmActor | null = user && profile ? { id: user.id, role: profile.role } : null;
  const canMutate = profile?.role === "admin" || profile?.role === "production_manager";

  const load = useCallback(async () => {
    if (!crmUsesSupabase() || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [l, it, loc] = await Promise.all([
        invListLots(filterItemId || undefined),
        invListItems(true),
        invListLocations(),
      ]);
      setLots(l);
      setItems(it);
      setLocations(loc);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [user, filterItemId]);

  useEffect(() => {
    void load();
  }, [load]);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const locMap = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyLot,
      item_id: filterItemId || (items[0]?.id ?? ""),
    });
    setDialogOpen(true);
  }

  function openEdit(row: InvLotRow) {
    setEditing(row);
    setForm({
      lot_code: row.lot_code,
      qty: String(row.qty),
      item_id: row.item_id,
      location_id: row.location_id ?? "",
      expires_on: row.expires_on ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!actor || !canMutate) {
      toast.error("Only operations can edit lots.");
      return;
    }
    if (!form.item_id || !form.lot_code.trim()) {
      toast.error("Item and lot code are required.");
      return;
    }
    const qty = Number(form.qty);
    if (!Number.isFinite(qty)) {
      toast.error("Invalid quantity.");
      return;
    }
    const { error } = await invSaveLot(
      {
        id: editing?.id,
        item_id: form.item_id,
        lot_code: form.lot_code.trim(),
        qty,
        location_id: form.location_id || null,
        expires_on: form.expires_on?.trim() || null,
      },
      actor
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Lot updated" : "Lot created");
    setDialogOpen(false);
    void load();
  }

  async function handleDelete() {
    if (!actor || !deleteTarget) return;
    const { error } = await invDeleteLot(deleteTarget.id, actor);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lot removed");
    setDeleteTarget(null);
    void load();
  }

  if (!crmUsesSupabase()) {
    return (
      <p className="text-sm text-muted-foreground">
        Lot tracking is available when the CRM uses Supabase (not local demo SQLite).
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/80 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Lots & batches</p>
        <p className="mt-1 text-xs leading-relaxed max-w-3xl">
          Track yarn dyelots, chemical batches, and finished roll IDs. Tie these to movements via{" "}
          <code className="text-foreground">lot_id</code> on future receipt/transfer flows as you extend workflows.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Filter by item</Label>
          <Select value={filterItemId || "__all__"} onValueChange={(v) => setFilterItemId(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="All items" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All items</SelectItem>
              {items.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.sku} — {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canMutate ? (
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-4 mr-1" />
            New lot
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lot code</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Expires</TableHead>
                {canMutate ? <TableHead className="w-[100px]" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canMutate ? 6 : 5} className="text-center text-muted-foreground py-8">
                    No lots yet.{" "}
                    <Link to="/crm/inventory/items" className="text-primary hover:underline">
                      Create items
                    </Link>{" "}
                    first, then add lots here.
                  </TableCell>
                </TableRow>
              ) : (
                lots.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.lot_code}</TableCell>
                    <TableCell className="text-sm">
                      <span className="font-mono text-xs">{itemMap.get(row.item_id)?.sku ?? "—"}</span>{" "}
                      {itemMap.get(row.item_id)?.name ?? ""}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.qty}</TableCell>
                    <TableCell className="text-xs">{row.location_id ? locMap.get(row.location_id) ?? "—" : "—"}</TableCell>
                    <TableCell className="text-xs">
                      {row.expires_on ? row.expires_on : "—"}
                    </TableCell>
                    {canMutate ? (
                      <TableCell className="text-right space-x-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteTarget(row)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit lot" : "New lot"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Item</Label>
              <Select value={form.item_id} onValueChange={(v) => setForm((f) => ({ ...f, item_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.sku} — {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="lot-code">Lot / batch code</Label>
              <Input
                id="lot-code"
                value={form.lot_code}
                onChange={(e) => setForm((f) => ({ ...f, lot_code: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lot-qty">Quantity</Label>
              <Input
                id="lot-qty"
                type="number"
                step="any"
                value={form.qty}
                onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Location (optional)</Label>
              <Select
                value={form.location_id || "__none__"}
                onValueChange={(v) => setForm((f) => ({ ...f, location_id: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="lot-exp">Expiry date (optional)</Label>
              <Input
                id="lot-exp"
                type="date"
                value={form.expires_on}
                onChange={(e) => setForm((f) => ({ ...f, expires_on: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lot?</AlertDialogTitle>
            <AlertDialogDescription>This removes the lot row only (ledger movements are unchanged).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
