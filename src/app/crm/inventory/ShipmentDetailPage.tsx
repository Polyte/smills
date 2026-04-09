import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { isCrmDataAvailable, listDeals, type DealWithContact } from "../../../lib/crm/crmRepo";
import type { CrmActor } from "../../../lib/crm/crmRepo";
import { invCompleteShipment, invGetShipment, invListItems, invListLocations } from "../../../lib/crm/inventoryRepo";
import { canWriteCommercial } from "../../../lib/crm/roles";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database } from "../database.types";
import { Button } from "../../components/ui/button";
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

type ShipRow = Database["public"]["Tables"]["inv_shipments"]["Row"];
type ShipLineRow = Database["public"]["Tables"]["inv_shipment_lines"]["Row"];

export function ShipmentDetailPage() {
  const { shipId } = useParams<{ shipId: string }>();
  const { user, profile } = useCrmAuth();
  const [ship, setShip] = useState<ShipRow | null>(null);
  const [lines, setLines] = useState<ShipLineRow[]>([]);
  const [deals, setDeals] = useState<DealWithContact[]>([]);
  const [itemSku, setItemSku] = useState<Map<string, string>>(new Map());
  const [locName, setLocName] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const actor: CrmActor | null =
    user && profile ? { id: user.id, role: profile.role } : null;
  const canWrite = canWriteCommercial(profile?.role);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user || !shipId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const bundle = await invGetShipment(shipId);
      if (!bundle) {
        setShip(null);
        return;
      }
      setShip(bundle.ship);
      setLines(bundle.lines);
      const [d, items, locs] = await Promise.all([listDeals(), invListItems(false), invListLocations()]);
      setDeals(d);
      setItemSku(new Map(items.map((i) => [i.id, i.sku])));
      setLocName(new Map(locs.map((l) => [l.id, l.name])));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load shipment");
    } finally {
      setLoading(false);
    }
  }, [user, shipId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function complete() {
    if (!actor || !shipId) return;
    setBusy(true);
    try {
      const { error } = await invCompleteShipment(shipId, actor);
      if (error) toast.error(error.message);
      else {
        toast.success("Shipped — stock reduced");
        void load();
      }
    } finally {
      setBusy(false);
    }
  }

  const dealTitle =
    ship?.deal_id ? deals.find((x) => x.id === ship.deal_id)?.title ?? ship.deal_id : null;

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!ship) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Shipment not found.</p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/crm/inventory/shipments">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/crm/inventory/shipments">← Shipments</Link>
        </Button>
        <Badge>{ship.status}</Badge>
      </div>
      {ship.tracking_number || ship.planned_ship_date || ship.logistics_notes ? (
        <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm space-y-1">
          {ship.tracking_number ? (
            <p>
              <span className="text-muted-foreground">Tracking: </span>
              {ship.tracking_number}
            </p>
          ) : null}
          {ship.planned_ship_date ? (
            <p>
              <span className="text-muted-foreground">Planned ship: </span>
              {ship.planned_ship_date}
            </p>
          ) : null}
          {ship.logistics_notes ? (
            <p>
              <span className="text-muted-foreground">Notes: </span>
              {ship.logistics_notes}
            </p>
          ) : null}
        </div>
      ) : null}
      {dealTitle ? (
        <p className="text-sm">
          <span className="text-muted-foreground">Deal: </span>
          {dealTitle}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No linked deal</p>
      )}
      {ship.shipped_at ? (
        <p className="text-xs text-muted-foreground">Shipped at {new Date(ship.shipped_at).toLocaleString()}</p>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Pick location</TableHead>
            <TableHead className="text-right">Qty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-mono text-xs">{itemSku.get(l.item_id) ?? l.item_id}</TableCell>
              <TableCell>{locName.get(l.location_id) ?? l.location_id}</TableCell>
              <TableCell className="text-right tabular-nums">{l.qty}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {canWrite && ship.status !== "shipped" ? (
        <Button type="button" disabled={busy} onClick={() => void complete()}>
          Complete shipment (post movements)
        </Button>
      ) : null}
    </div>
  );
}
