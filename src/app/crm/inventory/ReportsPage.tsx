import { useCallback, useEffect, useMemo, useState } from "react";
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
import { ClipboardCheck, Layers3, Scale, TrendingUp } from "lucide-react";
import {
  InventoryEmptyState,
  InventoryInfoStrip,
  InventoryMetricCard,
  InventoryPanel,
  InventoryTableShell,
  InventoryValuePill,
} from "./inventoryUi";

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

  const reportSummary = useMemo(() => {
    const totalStockValue = valuation.reduce((sum, row) => sum + row.value, 0);
    const totalQty = valuation.reduce((sum, row) => sum + row.qty, 0);
    const dealValue = margins.reduce((sum, row) => sum + Number(row.value_zar ?? 0), 0);
    const estCost = margins.reduce((sum, row) => sum + row.est_cost, 0);
    const estMargin = dealValue - estCost;
    const topValuation = [...valuation].sort((a, b) => b.value - a.value).slice(0, 5);

    return {
      totalStockValue,
      totalQty,
      skuCount: valuation.length,
      dealValue,
      estCost,
      estMargin,
      marginPct: dealValue > 0 ? (estMargin / dealValue) * 100 : null,
      topValuation,
    };
  }, [valuation, margins]);

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
    <div className="space-y-6">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <>
          <InventoryInfoStrip title="Inventory reporting">
            Valuation and margin views use the live movement ledger, standard costs, and linked shipment activity. Use
            this page for weekly stock value checks, landed-cost reviews, and cycle-count adjustments.
          </InventoryInfoStrip>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InventoryMetricCard label="Stock value" value={zar(reportSummary.totalStockValue)} tone="emerald" />
            <InventoryMetricCard
              label="Quantity on hand"
              value={reportSummary.totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              tone="blue"
            />
            <InventoryMetricCard label="Valued SKUs" value={reportSummary.skuCount.toLocaleString()} tone="violet" />
            <InventoryMetricCard
              label="Est. won margin"
              value={zar(reportSummary.estMargin)}
              tone={reportSummary.estMargin >= 0 ? "emerald" : "amber"}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.75fr]">
            <InventoryPanel
              title={
                <span className="inline-flex items-center gap-2">
                  <Scale className="size-4 text-primary" />
                  Stock valuation
                </span>
              }
              description="On-hand by standard cost per SKU, with all locations summed."
            >
              <InventoryTableShell className="rounded-none border-0 shadow-none">
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
                        <TableCell colSpan={4} className="p-6">
                          <InventoryEmptyState title="No stock to value">
                            Post receipts, production output, or adjustments to populate valuation.
                          </InventoryEmptyState>
                        </TableCell>
                      </TableRow>
                    ) : (
                      valuation.map((r) => (
                        <TableRow key={r.item_id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{r.sku}</TableCell>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            <InventoryValuePill>{r.qty.toFixed(4)}</InventoryValuePill>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <InventoryValuePill tone="good">{zar(r.value)}</InventoryValuePill>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </InventoryTableShell>
            </InventoryPanel>

            <InventoryPanel
              title={
                <span className="inline-flex items-center gap-2">
                  <Layers3 className="size-4 text-primary" />
                  Highest value SKUs
                </span>
              }
              description="Top stock value contributors from the current valuation."
            >
              <div className="p-4 sm:p-5">
                {reportSummary.topValuation.length === 0 ? (
                  <InventoryEmptyState title="No ranked SKUs">
                    Valued stock will appear here once ledger balances exist.
                  </InventoryEmptyState>
                ) : (
                  <ul className="space-y-2">
                    {reportSummary.topValuation.map((row, index) => (
                      <li
                        key={row.item_id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            <span className="mr-2 text-xs text-muted-foreground">#{index + 1}</span>
                            {row.name}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">{row.sku}</p>
                        </div>
                        <InventoryValuePill tone="good">{zar(row.value)}</InventoryValuePill>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </InventoryPanel>
          </div>

          <InventoryPanel
            title={
              <span className="inline-flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                Won deals - estimated margin
              </span>
            }
            description={
              <>
                Deal value vs estimated cost from shipped quantity by standard cost. Total margin:{" "}
                <strong className="text-foreground">{zar(reportSummary.estMargin)}</strong>
                {reportSummary.marginPct != null ? <> ({reportSummary.marginPct.toFixed(1)}%)</> : null}.
              </>
            }
          >
            <InventoryTableShell className="rounded-none border-0 shadow-none">
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
                      <TableCell colSpan={4} className="p-6">
                        <InventoryEmptyState title="No margin rows yet">
                          Won deals with linked shipment costs will appear here.
                        </InventoryEmptyState>
                      </TableCell>
                    </TableRow>
                  ) : (
                    margins.map((r) => {
                      const val = Number(r.value_zar ?? 0);
                      const margin = val - r.est_cost;
                      return (
                        <TableRow key={r.deal_id}>
                          <TableCell className="max-w-[240px] truncate font-medium">{r.title}</TableCell>
                          <TableCell className="text-right tabular-nums">{zar(val)}</TableCell>
                          <TableCell className="text-right tabular-nums">{zar(r.est_cost)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            <InventoryValuePill tone={margin >= 0 ? "good" : "warn"}>{zar(margin)}</InventoryValuePill>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </InventoryTableShell>
          </InventoryPanel>

          {isManager ? (
            <InventoryPanel
              title={
                <span className="inline-flex items-center gap-2">
                  <ClipboardCheck className="size-4 text-primary" />
                  Manager adjustment
                </span>
              }
              description="Post an ADJUSTMENT movement for cycle counts, write-offs, or stock corrections."
              className="max-w-3xl"
            >
              <form onSubmit={(e) => void postAdjustment(e)} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                <div className="grid gap-2">
                  <Label>Item</Label>
                  <Select value={adjItem} onValueChange={setAdjItem}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.sku} - {i.name}
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
                <div className="grid gap-2 sm:row-span-2">
                  <Label htmlFor="adj-n">Notes</Label>
                  <Textarea
                    id="adj-n"
                    value={adjNotes}
                    onChange={(e) => setAdjNotes(e.target.value)}
                    rows={5}
                    className="min-h-[120px]"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={adjBusy} className="w-full sm:w-auto">
                    Post adjustment
                  </Button>
                </div>
              </form>
            </InventoryPanel>
          ) : null}
        </>
      )}
    </div>
  );
}
