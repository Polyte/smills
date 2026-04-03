import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { isCrmDataAvailable } from "../../../lib/crm/crmRepo";
import type { CrmActor } from "../../../lib/crm/crmRepo";
import { invDeleteItem, invListItems, invSaveItem } from "../../../lib/crm/inventoryRepo";
import { INV_ITEM_CATEGORY_PRESETS } from "../../../lib/crm/industrySectorProductCatalog";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database, InvItemKind } from "../database.types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
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
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type ItemRow = Database["public"]["Tables"]["inv_items"]["Row"];

const KINDS: InvItemKind[] = ["raw", "wip", "finished"];

const emptyForm = {
  sku: "",
  name: "",
  kind: "raw" as InvItemKind,
  uom: "ea",
  standard_cost: "0",
  is_active: true,
  category: "Mill & yarn",
  description: "",
};

export function ItemsPage() {
  const { user, profile } = useCrmAuth();
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ItemRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ItemRow | null>(null);

  const actor: CrmActor | null =
    user && profile ? { id: user.id, role: profile.role } : null;
  const canMutate = profile?.role === "manager" || profile?.role === "employee";

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await invListItems(false);
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load items");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(row: ItemRow) {
    setEditing(row);
    setForm({
      sku: row.sku,
      name: row.name,
      kind: row.kind,
      uom: row.uom,
      standard_cost: String(row.standard_cost ?? 0),
      is_active: row.is_active,
      category: row.category?.trim() || "Mill & yarn",
      description: row.description ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!actor || !canMutate) {
      toast.error("Your role cannot edit items.");
      return;
    }
    const cost = Number(form.standard_cost);
    if (!form.sku.trim() || !form.name.trim()) {
      toast.error("SKU and name are required.");
      return;
    }
    const descTrim = form.description.trim();
    const { error } = await invSaveItem(
      {
        id: editing?.id,
        sku: form.sku.trim(),
        name: form.name.trim(),
        kind: form.kind,
        uom: form.uom.trim() || "ea",
        standard_cost: Number.isFinite(cost) ? cost : 0,
        is_active: form.is_active,
        category: form.category.trim() || "Mill & yarn",
        description: descTrim ? descTrim : null,
      },
      actor
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Item updated" : "Item created");
    setDialogOpen(false);
    void load();
  }

  async function handleDelete() {
    if (!actor || !deleteTarget) return;
    if (profile?.role !== "manager") {
      toast.error("Only managers can delete items.");
      return;
    }
    const { error } = await invDeleteItem(deleteTarget.id, actor);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Item deleted");
    setDeleteTarget(null);
    void load();
  }

  const groupedItems = useMemo(() => {
    const map = new Map<string, ItemRow[]>();
    for (const r of rows) {
      const cat = (r.category || "Mill & yarn").trim() || "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const colCount = canMutate ? 8 : 7;

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground max-w-2xl">
          SKUs grouped by category — mill output under <strong className="text-foreground">Mill &amp; yarn</strong>;
          industries served (mining, manufacturing, construction, cleaning, agriculture, logistics) match your
          sectors list.
        </p>
        {canMutate ? (
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-4 mr-1" />
            New item
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">Std cost</TableHead>
                <TableHead>Active</TableHead>
                {canMutate ? <TableHead className="w-[100px]" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="text-muted-foreground">
                    No items yet.
                  </TableCell>
                </TableRow>
              ) : (
                groupedItems.map(([category, catRows]) => (
                  <Fragment key={category}>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
                      <TableCell colSpan={colCount} className="py-3">
                        <div className="font-display text-sm font-semibold tracking-tight">{category}</div>
                        {catRows[0]?.description ? (
                          <p className="mt-1 text-xs text-muted-foreground max-w-4xl leading-relaxed">
                            {catRows[0].description}
                          </p>
                        ) : null}
                      </TableCell>
                    </TableRow>
                    {catRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {r.category || "Mill & yarn"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {r.kind}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.uom}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(r.standard_cost).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>{r.is_active ? "Yes" : "No"}</TableCell>
                        {canMutate ? (
                          <TableCell className="text-right space-x-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Edit"
                              onClick={() => openEdit(r)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            {profile?.role === "manager" ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Delete"
                                onClick={() => setDeleteTarget(r)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            ) : null}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit item" : "New item"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="inv-sku">SKU</Label>
              <Input
                id="inv-sku"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv-name">Name</Label>
              <Input
                id="inv-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv-category">Category</Label>
              <Input
                id="inv-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                list="inv-item-category-presets"
                placeholder="e.g. Mining, Mill & yarn"
              />
              <datalist id="inv-item-category-presets">
                {INV_ITEM_CATEGORY_PRESETS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv-desc">Sector / product description</Label>
              <Textarea
                id="inv-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional — e.g. industry blurb shown under the category header"
                rows={3}
                className="resize-y min-h-[72px]"
              />
            </div>
            <div className="grid gap-2">
              <Label>Kind</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => setForm((f) => ({ ...f, kind: v as InvItemKind }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv-uom">Unit of measure</Label>
              <Input
                id="inv-uom"
                value={form.uom}
                onChange={(e) => setForm((f) => ({ ...f, uom: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv-cost">Standard cost (ZAR)</Label>
              <Input
                id="inv-cost"
                type="number"
                step="0.01"
                value={form.standard_cost}
                onChange={(e) => setForm((f) => ({ ...f, standard_cost: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="inv-active"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="rounded border-input"
              />
              <Label htmlFor="inv-active" className="font-normal">
                Active
              </Label>
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
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone if the SKU has no dependent movements blocking delete.
            </AlertDialogDescription>
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
