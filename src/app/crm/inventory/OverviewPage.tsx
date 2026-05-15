import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { isCrmDataAvailable } from "../../../lib/crm/crmRepo";
import {
  invItemsBelowReorderMin,
  invListItems,
  invListLocations,
  invListMovements,
  invOverviewStats,
  invReportValuation,
} from "../../../lib/crm/inventoryRepo";
import { crmUsesSupabase } from "../../../lib/crm/crmRepo";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database } from "../database.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { toast } from "sonner";
import { Link } from "react-router";
import { AlertTriangle, PackageCheck, Route } from "lucide-react";
import {
  InventoryEmptyState,
  InventoryInfoStrip,
  InventoryMetricCard,
  InventoryPanel,
  InventoryTableShell,
  InventoryValuePill,
} from "./inventoryUi";

type MovRow = Database["public"]["Tables"]["inv_movements"]["Row"];
type ItemRow = Database["public"]["Tables"]["inv_items"]["Row"];

const LOW_STOCK_THRESHOLD = 10;

export function OverviewPage() {
  const { user } = useCrmAuth();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof invOverviewStats>> | null>(null);
  const [movements, setMovements] = useState<MovRow[]>([]);
  const [lowStock, setLowStock] = useState<{ sku: string; name: string; qty: number }[]>([]);
  const [reorderAlerts, setReorderAlerts] = useState<
    { sku: string; name: string; qty_total: number; reorder_min: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [s, mov, valuation, items] = await Promise.all([
        invOverviewStats(),
        invListMovements(20),
        invReportValuation(),
        invListItems(true),
      ]);
      setStats(s);
      setMovements(mov);
      if (crmUsesSupabase()) {
        try {
          setReorderAlerts(await invItemsBelowReorderMin());
        } catch {
          setReorderAlerts([]);
        }
      } else {
        setReorderAlerts([]);
      }
      const finishedIds = new Set(items.filter((i) => i.kind === "finished").map((i) => i.id));
      const low = valuation
        .filter((v) => finishedIds.has(v.item_id) && v.qty < LOW_STOCK_THRESHOLD && v.qty >= 0)
        .map((v) => ({ sku: v.sku, name: v.name, qty: v.qty }))
        .sort((a, b) => a.qty - b.qty)
        .slice(0, 12);
      setLowStock(low);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load overview");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const [movLabels, setMovLabels] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (movements.length === 0) {
      setMovLabels(new Map());
      return;
    }
    void (async () => {
      try {
        const items = await invListItems(true);
        const map = new Map(items.map((i) => [i.id, i])) as Map<string, ItemRow>;
        const locs = await invListLocations();
        const locMap = new Map(locs.map((l) => [l.id, l.name]));
        const next = new Map<string, string>();
        for (const mv of movements) {
          const sku = map.get(mv.item_id)?.sku ?? mv.item_id.slice(0, 8);
          const loc = locMap.get(mv.location_id) ?? "?";
          next.set(mv.id, `${sku} @ ${loc}`);
        }
        setMovLabels(next);
      } catch {
        setMovLabels(new Map());
      }
    })();
  }, [movements]);

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <>
          <InventoryInfoStrip title="Operations overview">
              Use <strong className="font-medium text-foreground">receipts</strong> for fibre, bought-in yarn, and
              materials, <strong className="font-medium text-foreground">production</strong> for spinning, twisting, and
              weaving issues/receipts, and <strong className="font-medium text-foreground">shipments</strong> for greige,
              industrial woven, and finished-goods dispatch.
          </InventoryInfoStrip>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InventoryMetricCard
              label="Open production orders"
              value={stats?.openPOs ?? 0}
              href="/crm/inventory/production"
              linkLabel="View production"
              tone="blue"
            />
            <InventoryMetricCard
              label="Open fabric / yarn shipments"
              value={stats?.draftShipments ?? 0}
              href="/crm/inventory/shipments"
              linkLabel="View shipments"
              tone="amber"
            />
            <InventoryMetricCard
              label="Stock value (all items - std cost)"
              value={
                stats
                  ? stats.totalStockValue.toLocaleString(undefined, {
                      style: "currency",
                      currency: "ZAR",
                      maximumFractionDigits: 0,
                    })
                  : "-"
              }
              href="/crm/inventory/reports"
              linkLabel="Reports"
              tone="emerald"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <InventoryPanel
              title="Below reorder minimum"
              description={
                <>
                  Active items where total on-hand is under the SKU&apos;s{" "}
                  <strong className="font-medium text-foreground">reorder_min</strong>.
                </>
              }
            >
              <div className="p-4 sm:p-5">
                {reorderAlerts.length === 0 ? (
                  <InventoryEmptyState title="Reorder levels are healthy" icon={PackageCheck}>
                    No reorder alerts, or thresholds are not configured yet.
                  </InventoryEmptyState>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {reorderAlerts.map((r) => (
                      <li key={r.sku} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                        <span className="min-w-0">
                          <span className="font-mono text-xs text-muted-foreground">{r.sku}</span>
                          <span className="block truncate font-medium text-foreground">{r.name}</span>
                        </span>
                        <InventoryValuePill tone="warn">
                          {r.qty_total} / {r.reorder_min}
                        </InventoryValuePill>
                      </li>
                    ))}
                  </ul>
                )}
                <Link to="/crm/inventory/lots" className="mt-3 inline-block text-xs text-primary hover:underline">
                  View lots
                </Link>
              </div>
            </InventoryPanel>

            <InventoryPanel
              title="Low stock (finished SKUs)"
              description={`Cones, greige rolls, or packed FG below ${LOW_STOCK_THRESHOLD} units across locations.`}
            >
              <div className="p-4 sm:p-5">
                {lowStock.length === 0 ? (
                  <InventoryEmptyState title="Finished goods look stocked" icon={PackageCheck}>
                    No finished SKUs are below the current low-stock threshold.
                  </InventoryEmptyState>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {lowStock.map((r) => (
                      <li key={r.sku} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                        <span className="min-w-0">
                          <span className="font-mono text-xs text-muted-foreground">{r.sku}</span>
                          <span className="block truncate font-medium text-foreground">{r.name}</span>
                        </span>
                        <InventoryValuePill tone="warn">{r.qty}</InventoryValuePill>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </InventoryPanel>

            <InventoryPanel title="Recent movements" description="Latest ledger rows">
              {movements.length === 0 ? (
                <div className="p-5">
                  <InventoryEmptyState title="No movement yet" icon={Route}>
                    Receipts, transfers, production, and shipments will appear here as the ledger grows.
                  </InventoryEmptyState>
                </div>
              ) : (
                <InventoryTableShell className="rounded-none border-0 shadow-none">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Item / loc</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="whitespace-nowrap text-xs">
                            {format(new Date(m.created_at), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell className="text-xs">
                            <InventoryValuePill tone={m.qty_delta >= 0 ? "good" : "info"}>{m.movement_type}</InventoryValuePill>
                          </TableCell>
                          <TableCell className="max-w-[140px] truncate text-xs">
                            {movLabels.get(m.id) ?? "..."}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            <InventoryValuePill tone={m.qty_delta < 0 ? "warn" : "good"}>{m.qty_delta}</InventoryValuePill>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </InventoryTableShell>
              )}
            </InventoryPanel>
          </div>
        </>
      )}
    </div>
  );
}
