import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { isCrmDataAvailable } from "../../../lib/crm/crmRepo";
import type { CrmActor } from "../../../lib/crm/crmRepo";
import {
  invCreateProductionOrder,
  invListItems,
  invListLocations,
  invListProductionOrders,
} from "../../../lib/crm/inventoryRepo";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database } from "../database.types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type PORow = Database["public"]["Tables"]["inv_production_orders"]["Row"];
type ItemRow = Database["public"]["Tables"]["inv_items"]["Row"];
type LocRow = Database["public"]["Tables"]["inv_locations"]["Row"];

type LineDraft = { item_id: string; qty_planned: string };

export function ProductionListPage() {
  const { user, profile } = useCrmAuth();
  const [rows, setRows] = useState<PORow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [locs, setLocs] = useState<LocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [issueLoc, setIssueLoc] = useState("");
  const [receiptLoc, setReceiptLoc] = useState("");
  const [notes, setNotes] = useState("");
  const [linesIn, setLinesIn] = useState<LineDraft[]>([{ item_id: "", qty_planned: "1" }]);
  const [linesOut, setLinesOut] = useState<LineDraft[]>([{ item_id: "", qty_planned: "1" }]);
  const [saving, setSaving] = useState(false);

  const actor: CrmActor | null =
    user && profile ? { id: user.id, role: profile.role } : null;
  const canWrite =
    profile?.role === "admin" || profile?.role === "production_manager";

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [po, it, lc] = await Promise.all([
        invListProductionOrders(),
        invListItems(true),
        invListLocations(),
      ]);
      setRows(po);
      setItems(it);
      setLocs(lc);
      const prod = lc.find((l) => l.zone === "production") ?? lc[0];
      const wh = lc.find((l) => l.zone === "warehouse") ?? lc[0];
      setIssueLoc((cur) => cur || prod?.id || "");
      setReceiptLoc((cur) => cur || wh?.id || "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  function addLineIn() {
    setLinesIn((x) => [...x, { item_id: "", qty_planned: "1" }]);
  }
  function addLineOut() {
    setLinesOut((x) => [...x, { item_id: "", qty_planned: "1" }]);
  }

  async function handleCreate() {
    if (!actor || !canWrite) return;
    const lin = linesIn
      .map((l) => ({ item_id: l.item_id, qty_planned: Number(l.qty_planned) }))
      .filter((l) => l.item_id && Number.isFinite(l.qty_planned) && l.qty_planned > 0);
    const lout = linesOut
      .map((l) => ({ item_id: l.item_id, qty_planned: Number(l.qty_planned) }))
      .filter((l) => l.item_id && Number.isFinite(l.qty_planned) && l.qty_planned > 0);
    if (lin.length === 0 || lout.length === 0) {
      toast.error("Add at least one raw line and one output line with positive quantities.");
      return;
    }
    if (!issueLoc || !receiptLoc) {
      toast.error("Choose issue and receipt locations.");
      return;
    }
    setSaving(true);
    try {
      const { id, error } = await invCreateProductionOrder(actor, {
        issue_location_id: issueLoc,
        receipt_location_id: receiptLoc,
        notes: notes.trim() || undefined,
        linesIn: lin,
        linesOut: lout,
      });
      if (error || !id) {
        toast.error(error?.message ?? "Create failed");
        return;
      }
      toast.success("Production order created");
      setDialogOpen(false);
      setNotes("");
      setLinesIn([{ item_id: "", qty_planned: "1" }]);
      setLinesOut([{ item_id: "", qty_planned: "1" }]);
      void load();
    } finally {
      setSaving(false);
    }
  }

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Draft → release → complete posts raw issues and FG/WIP receipts to the ledger.
        </p>
        {canWrite ? (
          <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4 mr-1" />
            New order
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
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No production orders yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant="secondary">{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm">{r.notes ?? "—"}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/crm/inventory/production/${r.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen && canWrite} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New production order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Issue raw from</Label>
              <Select value={issueLoc} onValueChange={setIssueLoc}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locs.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.zone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Receive output into</Label>
              <Select value={receiptLoc} onValueChange={setReceiptLoc}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locs.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.zone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="po-notes">Notes</Label>
              <Textarea
                id="po-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Materials in (raw)</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addLineIn}>
                  Add line
                </Button>
              </div>
              <div className="space-y-2">
                {linesIn.map((line, idx) => (
                  <div key={idx} className="flex gap-2 flex-wrap">
                    <Select
                      value={line.item_id}
                      onValueChange={(v) =>
                        setLinesIn((rows) => rows.map((r, i) => (i === idx ? { ...r, item_id: v } : r)))
                      }
                    >
                      <SelectTrigger className="flex-1 min-w-[200px]">
                        <SelectValue placeholder="Item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.sku}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="w-24"
                      type="number"
                      step="any"
                      value={line.qty_planned}
                      onChange={(e) =>
                        setLinesIn((rows) =>
                          rows.map((r, i) => (i === idx ? { ...r, qty_planned: e.target.value } : r))
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Output (FG / WIP)</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addLineOut}>
                  Add line
                </Button>
              </div>
              <div className="space-y-2">
                {linesOut.map((line, idx) => (
                  <div key={idx} className="flex gap-2 flex-wrap">
                    <Select
                      value={line.item_id}
                      onValueChange={(v) =>
                        setLinesOut((rows) => rows.map((r, i) => (i === idx ? { ...r, item_id: v } : r)))
                      }
                    >
                      <SelectTrigger className="flex-1 min-w-[200px]">
                        <SelectValue placeholder="Item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.sku}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="w-24"
                      type="number"
                      step="any"
                      value={line.qty_planned}
                      onChange={(e) =>
                        setLinesOut((rows) =>
                          rows.map((r, i) => (i === idx ? { ...r, qty_planned: e.target.value } : r))
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleCreate()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
