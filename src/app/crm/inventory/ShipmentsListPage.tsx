import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { isCrmDataAvailable, listDeals, type DealWithContact } from "../../../lib/crm/crmRepo";
import type { CrmActor } from "../../../lib/crm/crmRepo";
import {
  invCreateShipment,
  invListItems,
  invListLocations,
  invListShipments,
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

type ShipRow = Database["public"]["Tables"]["inv_shipments"]["Row"];
type ItemRow = Database["public"]["Tables"]["inv_items"]["Row"];
type LocRow = Database["public"]["Tables"]["inv_locations"]["Row"];

type LineDraft = { item_id: string; location_id: string; qty: string };

export function ShipmentsListPage() {
  const { user, profile } = useCrmAuth();
  const [rows, setRows] = useState<ShipRow[]>([]);
  const [deals, setDeals] = useState<DealWithContact[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [locs, setLocs] = useState<LocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dealId, setDealId] = useState<string>("");
  const [lines, setLines] = useState<LineDraft[]>([{ item_id: "", location_id: "", qty: "1" }]);
  const [saving, setSaving] = useState(false);

  const actor: CrmActor | null =
    user && profile ? { id: user.id, role: profile.role } : null;
  const canWrite = profile?.role === "manager" || profile?.role === "employee";

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [sh, d, it, lc] = await Promise.all([
        invListShipments(),
        listDeals(),
        invListItems(true),
        invListLocations(),
      ]);
      setRows(sh);
      setDeals(d);
      setItems(it);
      setLocs(lc);
      setLines((cur) => {
        if (cur.length && cur[0].item_id && cur[0].location_id) return cur;
        return [
          {
            item_id: it[0]?.id ?? "",
            location_id: lc[0]?.id ?? "",
            qty: "1",
          },
        ];
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  function addLine() {
    setLines((x) => [
      ...x,
      { item_id: items[0]?.id ?? "", location_id: locs[0]?.id ?? "", qty: "1" },
    ]);
  }

  async function handleCreate() {
    if (!actor || !canWrite) return;
    const parsed = lines
      .map((l) => ({
        item_id: l.item_id,
        location_id: l.location_id,
        qty: Number(l.qty),
      }))
      .filter((l) => l.item_id && l.location_id && Number.isFinite(l.qty) && l.qty > 0);
    if (parsed.length === 0) {
      toast.error("Add at least one line with item, pick location, and positive qty.");
      return;
    }
    setSaving(true);
    try {
      const d = dealId === "" ? null : dealId;
      const { id, error } = await invCreateShipment(actor, d, parsed);
      if (error || !id) {
        toast.error(error?.message ?? "Create failed");
        return;
      }
      toast.success("Shipment created");
      setDialogOpen(false);
      setDealId("");
      void load();
    } finally {
      setSaving(false);
    }
  }

  const dealLabel = (id: string | null) => {
    if (!id) return "—";
    const d = deals.find((x) => x.id === id);
    return d ? d.title : id.slice(0, 8);
  };

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Link optional CRM deal; complete posts negative shipment movements from pick locations.
        </p>
        {canWrite ? (
          <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4 mr-1" />
            New shipment
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
                <TableHead>Deal</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No shipments yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant="secondary">{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{dealLabel(r.deal_id)}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/crm/inventory/shipments/${r.id}`}>Open</Link>
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
            <DialogTitle>New shipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Deal (optional)</Label>
              <Select value={dealId || "__none__"} onValueChange={(v) => setDealId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No deal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No deal</SelectItem>
                  {deals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title}
                      {d.contacts?.company_name ? ` — ${d.contacts.company_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Lines (pick from location)</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addLine}>
                Add line
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
                  <div className="grid gap-1">
                    <span className="text-xs text-muted-foreground">Item</span>
                    <Select
                      value={line.item_id}
                      onValueChange={(v) =>
                        setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, item_id: v } : r)))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="SKU" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.sku}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-xs text-muted-foreground">Pick location</span>
                    <Select
                      value={line.location_id}
                      onValueChange={(v) =>
                        setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, location_id: v } : r)))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locs.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    className="w-20"
                    type="number"
                    step="any"
                    value={line.qty}
                    onChange={(e) =>
                      setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, qty: e.target.value } : r)))
                    }
                  />
                </div>
              ))}
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
