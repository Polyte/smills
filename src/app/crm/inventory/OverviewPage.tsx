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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
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
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="rounded-lg border border-border/80 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Operations overview</p>
            <p className="mt-1 text-xs leading-relaxed max-w-3xl">
              Use <strong className="text-foreground font-medium">receipts</strong> for fibre, bought-in yarn, and
              materials, <strong className="text-foreground font-medium">production</strong> for spinning, twisting, and
              weaving issues/receipts, and <strong className="text-foreground font-medium">shipments</strong> for greige,
              industrial woven, and finished-goods dispatch. Item kinds: raw (fibre/staple), WIP (sliver, yarn on
              machines), finished (cones, rolls, shade-net strips, packs).
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Open production orders</CardDescription>
                <CardTitle className="text-3xl font-display tabular-nums">{stats?.openPOs ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/crm/inventory/production" className="text-sm text-primary hover:underline">
                  View production
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Open fabric / yarn shipments</CardDescription>
                <CardTitle className="text-3xl font-display tabular-nums">{stats?.draftShipments ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/crm/inventory/shipments" className="text-sm text-primary hover:underline">
                  View shipments
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Stock value (all items · std cost)</CardDescription>
                <CardTitle className="text-2xl font-display tabular-nums">
                  {stats
                    ? stats.totalStockValue.toLocaleString(undefined, {
                        style: "currency",
                        currency: "ZAR",
                        maximumFractionDigits: 0,
                      })
                    : "—"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/crm/inventory/reports" className="text-sm text-primary hover:underline">
                  Reports
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Below reorder minimum</CardTitle>
                <CardDescription>
                  Active items where total on-hand (all locations) is under the SKU&apos;s{" "}
                  <strong className="text-foreground font-medium">reorder_min</strong> — set on the Items screen
                  (Supabase).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reorderAlerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No reorder alerts, or thresholds not set / not on Supabase.
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {reorderAlerts.map((r) => (
                      <li key={r.sku} className="flex justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
                        <span>
                          <span className="font-mono text-xs">{r.sku}</span> — {r.name}
                        </span>
                        <span className="tabular-nums text-amber-700 dark:text-amber-400">
                          {r.qty_total} / {r.reorder_min}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link to="/crm/inventory/lots" className="inline-block mt-3 text-xs text-primary hover:underline">
                  View lots
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Low stock (finished SKUs)</CardTitle>
                <CardDescription>
                  Cones, greige rolls, or packed FG below {LOW_STOCK_THRESHOLD} units (all locations).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lowStock.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No finished SKUs below threshold.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {lowStock.map((r) => (
                      <li key={r.sku} className="flex justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
                        <span>
                          <span className="font-mono text-xs">{r.sku}</span> — {r.name}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{r.qty}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent movements</CardTitle>
                <CardDescription>Latest ledger rows</CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:px-6">
                {movements.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 pb-6">No movements yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Item / loc</TableHead>
                        <TableHead className="text-right">Qty Δ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(m.created_at), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell className="text-xs">{m.movement_type}</TableCell>
                          <TableCell className="text-xs max-w-[140px] truncate">
                            {movLabels.get(m.id) ?? "…"}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{m.qty_delta}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
