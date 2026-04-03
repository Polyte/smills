import { useCallback, useEffect, useState } from "react";
import { isCrmDataAvailable } from "../../../lib/crm/crmRepo";
import { invListItems, invListLocations, invListStockBalances } from "../../../lib/crm/inventoryRepo";
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
import { Input } from "../../components/ui/input";
import { toast } from "sonner";

type BalanceRow = Database["public"]["Views"]["inv_stock_balances"]["Row"];
type EnrichedBalance = BalanceRow & { sku: string; name: string; loc: string; zone: string };

export function StockPage() {
  const { user } = useCrmAuth();
  const [rows, setRows] = useState<EnrichedBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [bal, items, locs] = await Promise.all([
        invListStockBalances(),
        invListItems(false),
        invListLocations(),
      ]);
      const itemMap = new Map(items.map((i) => [i.id, i]));
      const locMap = new Map(locs.map((l) => [l.id, l]));
      const enriched: EnrichedBalance[] = bal
        .map((b) => ({
          ...b,
          sku: itemMap.get(b.item_id)?.sku ?? b.item_id,
          name: itemMap.get(b.item_id)?.name ?? "",
          loc: locMap.get(b.location_id)?.name ?? b.location_id,
          zone: locMap.get(b.location_id)?.zone ?? "",
        }))
        .sort((a, b) => a.sku.localeCompare(b.sku) || a.loc.localeCompare(b.loc));
      setRows(enriched);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load stock");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  const q = filter.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.sku.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.loc.toLowerCase().includes(q)
      )
    : rows;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Balances from the movement ledger — all inventory items (inactive SKUs included if they still have on-hand
        qty).
      </p>
      <Input
        placeholder="Filter by SKU, name, or location…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-md"
      />
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead className="text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No balances match.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={`${r.item_id}-${r.location_id}`}>
                    <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                    <TableCell className="text-sm">{r.name}</TableCell>
                    <TableCell>{r.loc}</TableCell>
                    <TableCell className="text-xs capitalize text-muted-foreground">{r.zone}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.qty).toFixed(4)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
