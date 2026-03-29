import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { isCrmDataAvailable } from "../../../lib/crm/crmRepo";
import type { CrmActor } from "../../../lib/crm/crmRepo";
import {
  invCompleteProductionOrder,
  invGetProductionOrder,
  invListItems,
  invListLocations,
  invReleaseProductionOrder,
  invUpdatePOLineActuals,
} from "../../../lib/crm/inventoryRepo";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database } from "../database.types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
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

type LineInRow = Database["public"]["Tables"]["inv_production_lines_in"]["Row"];
type LineOutRow = Database["public"]["Tables"]["inv_production_lines_out"]["Row"];
type PORow = Database["public"]["Tables"]["inv_production_orders"]["Row"];

export function ProductionDetailPage() {
  const { poId } = useParams<{ poId: string }>();
  const { user, profile } = useCrmAuth();
  const [po, setPo] = useState<PORow | null>(null);
  const [linesIn, setLinesIn] = useState<LineInRow[]>([]);
  const [linesOut, setLinesOut] = useState<LineOutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemSku, setItemSku] = useState<Map<string, string>>(new Map());
  const [locName, setLocName] = useState<Map<string, string>>(new Map());
  const [busy, setBusy] = useState(false);

  const actor: CrmActor | null =
    user && profile ? { id: user.id, role: profile.role } : null;
  const canWrite = profile?.role === "manager" || profile?.role === "employee";

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user || !poId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const bundle = await invGetProductionOrder(poId);
      if (!bundle) {
        setPo(null);
        return;
      }
      setPo(bundle.po);
      setLinesIn(bundle.linesIn);
      setLinesOut(bundle.linesOut);
      const [items, locs] = await Promise.all([invListItems(false), invListLocations()]);
      setItemSku(new Map(items.map((i) => [i.id, i.sku])));
      setLocName(new Map(locs.map((l) => [l.id, l.name])));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load order");
    } finally {
      setLoading(false);
    }
  }, [user, poId]);

  useEffect(() => {
    void load();
  }, [load]);

  function setActualIn(id: string, v: string) {
    const n = v === "" ? null : Number(v);
    setLinesIn((rows) =>
      rows.map((r) => (r.id === id ? { ...r, qty_actual: n != null && Number.isFinite(n) ? n : null } : r))
    );
  }
  function setActualOut(id: string, v: string) {
    const n = v === "" ? null : Number(v);
    setLinesOut((rows) =>
      rows.map((r) => (r.id === id ? { ...r, qty_actual: n != null && Number.isFinite(n) ? n : null } : r))
    );
  }

  async function saveActuals() {
    if (!actor || !canWrite) return;
    setBusy(true);
    try {
      const { error } = await invUpdatePOLineActuals(
        linesIn.map((l) => ({ id: l.id, qty_actual: l.qty_actual })),
        linesOut.map((l) => ({ id: l.id, qty_actual: l.qty_actual })),
        actor
      );
      if (error) toast.error(error.message);
      else {
        toast.success("Actuals saved");
        void load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function release() {
    if (!actor || !poId) return;
    setBusy(true);
    try {
      const { error } = await invReleaseProductionOrder(poId, actor);
      if (error) toast.error(error.message);
      else {
        toast.success("Released");
        void load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!actor || !poId) return;
    setBusy(true);
    try {
      const { error } = await invCompleteProductionOrder(poId, actor);
      if (error) toast.error(error.message);
      else {
        toast.success("Completed — movements posted");
        void load();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!po) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Order not found.</p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/crm/inventory/production">Back to list</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/crm/inventory/production">← Production</Link>
        </Button>
        <Badge>{po.status}</Badge>
        <span className="text-sm text-muted-foreground">
          Issue: {locName.get(po.issue_location_id) ?? po.issue_location_id} → Receive:{" "}
          {locName.get(po.receipt_location_id) ?? po.receipt_location_id}
        </span>
      </div>
      {po.notes ? <p className="text-sm">{po.notes}</p> : null}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Materials in</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Planned</TableHead>
              <TableHead className="text-right">Actual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linesIn.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{itemSku.get(l.item_id) ?? l.item_id}</TableCell>
                <TableCell className="text-right tabular-nums">{l.qty_planned}</TableCell>
                <TableCell className="text-right w-32">
                  {canWrite && po.status !== "completed" ? (
                    <Input
                      className="h-8 text-right"
                      type="number"
                      step="any"
                      value={l.qty_actual ?? ""}
                      placeholder={String(l.qty_planned)}
                      onChange={(e) => setActualIn(l.id, e.target.value)}
                    />
                  ) : (
                    <span className="tabular-nums">{l.qty_actual ?? l.qty_planned}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Output</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Planned</TableHead>
              <TableHead className="text-right">Actual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linesOut.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{itemSku.get(l.item_id) ?? l.item_id}</TableCell>
                <TableCell className="text-right tabular-nums">{l.qty_planned}</TableCell>
                <TableCell className="text-right w-32">
                  {canWrite && po.status !== "completed" ? (
                    <Input
                      className="h-8 text-right"
                      type="number"
                      step="any"
                      value={l.qty_actual ?? ""}
                      placeholder={String(l.qty_planned)}
                      onChange={(e) => setActualOut(l.id, e.target.value)}
                    />
                  ) : (
                    <span className="tabular-nums">{l.qty_actual ?? l.qty_planned}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {canWrite && po.status !== "completed" ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void saveActuals()}>
            Save actuals
          </Button>
          {po.status === "draft" ? (
            <Button type="button" disabled={busy} onClick={() => void release()}>
              Release
            </Button>
          ) : null}
          {po.status === "released" ? (
            <Button type="button" disabled={busy} onClick={() => void complete()}>
              Complete (post movements)
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
