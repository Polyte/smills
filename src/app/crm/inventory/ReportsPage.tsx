import { useCallback, useEffect, useState } from "react";
import { isCrmDataAvailable } from "../../../lib/crm/crmRepo";
import type { CrmActor } from "../../../lib/crm/crmRepo";
import {
  invListItems,
  invListLocations,
  invPostAdjustment,
  invReportDealMargins,
  invReportValuation,
} from "../../../lib/crm/inventoryRepo";
import { isOpsAdmin } from "../../../lib/crm/roles";
import { useCrmAuth } from "../CrmAuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
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
import { toast } from "sonner";

const zar = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "ZAR", maximumFractionDigits: 2 });

export function ReportsPage() {
  const { user, profile } = useCrmAuth();
  const [valuation, setValuation] = useState<Awaited<ReturnType<typeof invReportValuation>>>([]);
  const [margins, setMargins] = useState<Awaited<ReturnType<typeof invReportDealMargins>>>([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Awaited<ReturnType<typeof invListItems>>>([]);
  const [locs, setLocs] = useState<Awaited<ReturnType<typeof invListLocations>>>([]);
  const [adjItem, setAdjItem] = useState("");
  const [adjLoc, setAdjLoc] = useState("");
  const [adjDelta, setAdjDelta] = useState("0");
  const [adjNotes, setAdjNotes] = useState("");
  const [adjBusy, setAdjBusy] = useState(false);

  const actor: CrmActor | null =
    user && profile ? { id: user.id, role: profile.role } : null;
  const isManager = isOpsAdmin(profile?.role);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [v, m, it, lc] = await Promise.all([
        invReportValuation(),
        invReportDealMargins(),
        invListItems(true),
        invListLocations(),
      ]);
      setValuation(v.sort((a, b) => a.sku.localeCompare(b.sku)));
      setMargins(m);
      setItems(it);
      setLocs(lc);
      setAdjItem((cur) => cur || it[0]?.id || "");
      setAdjLoc((cur) => cur || lc[0]?.id || "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load reports");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function postAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!actor || !isManager) return;
    const d = Number(adjDelta);
    if (!Number.isFinite(d) || d === 0) {
      toast.error("Enter a non-zero quantity delta.");
      return;
    }
    if (!adjItem || !adjLoc) return;
    setAdjBusy(true);
    try {
      const { error } = await invPostAdjustment(actor, {
        item_id: adjItem,
        location_id: adjLoc,
        qty_delta: d,
        notes: adjNotes.trim() || undefined,
      });
      if (error) toast.error(error.message);
      else {
        toast.success("Adjustment posted");
        setAdjNotes("");
        void load();
      }
    } finally {
      setAdjBusy(false);
    }
  }

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  return (
    <div className="space-y-10">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Stock valuation</h3>
            <p className="text-sm text-muted-foreground">On-hand × standard cost per SKU (all locations summed).</p>
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {valuation.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        No stock to value.
                      </TableCell>
                    </TableRow>
                  ) : (
                    valuation.map((r) => (
                      <TableRow key={r.item_id}>
                        <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.qty.toFixed(4)}</TableCell>
                        <TableCell className="text-right tabular-nums">{zar(r.value)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Won deals — estimated margin</h3>
            <p className="text-sm text-muted-foreground">
              Deal value vs estimated cost from shipped qty × standard cost (SHIPMENT movements linked to the deal).
            </p>
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead className="text-right">Value (ZAR)</TableHead>
                    <TableHead className="text-right">Est. cost</TableHead>
                    <TableHead className="text-right">Est. margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {margins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        No won deals or no shipment costs recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    margins.map((r) => {
                      const val = Number(r.value_zar ?? 0);
                      const margin = val - r.est_cost;
                      return (
                        <TableRow key={r.deal_id}>
                          <TableCell className="max-w-[240px] truncate">{r.title}</TableCell>
                          <TableCell className="text-right tabular-nums">{zar(val)}</TableCell>
                          <TableCell className="text-right tabular-nums">{zar(r.est_cost)}</TableCell>
                          <TableCell className="text-right tabular-nums">{zar(margin)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          {isManager ? (
            <section className="space-y-3 max-w-md">
              <h3 className="text-lg font-semibold">Manager adjustment</h3>
              <p className="text-sm text-muted-foreground">
                Posts an ADJUSTMENT movement (positive or negative) for cycle counts or corrections.
              </p>
              <form onSubmit={(e) => void postAdjustment(e)} className="space-y-3 rounded-lg border border-border p-4">
                <div className="grid gap-2">
                  <Label>Item</Label>
                  <Select value={adjItem} onValueChange={setAdjItem}>
                    <SelectTrigger>
                      <SelectValue />
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
                <div className="grid gap-2">
                  <Label>Location</Label>
                  <Select value={adjLoc} onValueChange={setAdjLoc}>
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
                <div className="grid gap-2">
                  <Label htmlFor="adj-d">Qty delta</Label>
                  <Input
                    id="adj-d"
                    type="number"
                    step="any"
                    value={adjDelta}
                    onChange={(e) => setAdjDelta(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adj-n">Notes</Label>
                  <Textarea
                    id="adj-n"
                    value={adjNotes}
                    onChange={(e) => setAdjNotes(e.target.value)}
                    rows={2}
                  />
                </div>
                <Button type="submit" disabled={adjBusy}>
                  Post adjustment
                </Button>
              </form>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
