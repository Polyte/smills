import { useCallback, useEffect, useMemo, useState } from "react";
import { canWritePlanning } from "../../../lib/crm/roles";
import { useCrmAuth } from "../CrmAuthContext";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ScrollArea, ScrollBar } from "../../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Textarea } from "../../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Checkbox } from "../../components/ui/checkbox";
import { toast } from "sonner";
import {
  SPP_DEVIATION_REASONS,
  type ParsedPipelineRow,
  type SppDeviationReason,
  type SppLineBundle,
  type SppProductLine,
  type SppTrackerRow,
  sppAddAdHocLine,
  sppEnsureTracker,
  sppGetTracker,
  sppListOrderLines,
  sppListPipelineImports,
  sppLoadBundle,
  sppUpsertMonthlyTarget,
  sppUpsertVarianceNote,
  sppUpsertWeeklyActual,
  sppUpsertWeeklyPlan,
} from "../../../lib/crm/sppRepo";
import { distributeQtyAcrossWeeks, monthWeekStarts, weekStartsOnFromDb } from "../../../lib/crm/sppWeekUtils";
import { sppDownloadExecutiveCsv, sppRollupDeviationReasons } from "../../../lib/crm/sppExecutiveExport";
import { cn } from "../../components/ui/utils";
import type { CrmActor } from "../../../lib/crm/crmRepo";
import { PlanningImportDialog } from "../planning/PlanningImportDialog";
import { PlanningWorkforcePanel } from "../planning/PlanningWorkforcePanel";

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const REASON_LABEL: Record<SppDeviationReason, string> = {
  raw_material_in_transit: "Raw materials (in transit)",
  raw_material_unavailable: "Raw materials (not available)",
  equipment_breakdown: "Equipment / maintenance",
  labour_turnout: "Labour turnout",
  labour_efficiency: "Labour efficiency",
  holiday: "Holiday / shutdown",
  poor_planning: "Planning not feasible",
  other: "Other",
};

export function PlanningTrackerPage() {
  const { profile } = useCrmAuth();
  const actor = profile ? { id: profile.id, role: profile.role } : null;
  const canWrite = canWritePlanning(profile?.role);

  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  const [productLine, setProductLine] = useState<SppProductLine>("yarn");
  const [tracker, setTracker] = useState<SppTrackerRow | null>(null);
  const [lines, setLines] = useState<SppLineBundle[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableEpoch, setTableEpoch] = useState(0);
  const [viewTab, setViewTab] = useState<"detail" | "summary" | "executive">("detail");
  const [adHocOnly, setAdHocOnly] = useState(false);
  const [importOpeningOpen, setImportOpeningOpen] = useState(false);
  const [importMoreOpen, setImportMoreOpen] = useState(false);
  const [auditImports, setAuditImports] = useState<Awaited<ReturnType<typeof sppListPipelineImports>>>([]);

  const displayLines = useMemo(
    () => (adHocOnly ? lines.filter((l) => l.is_ad_hoc) : lines),
    [lines, adHocOnly]
  );

  const weeks = useMemo(() => {
    if (!tracker) return [];
    return monthWeekStarts(tracker.year_month, weekStartsOnFromDb(tracker.week_starts_on));
  }, [tracker]);

  const refresh = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const t = await sppGetTracker(yearMonth, productLine);
      setTracker(t);
      if (!t) {
        setLines([]);
        return;
      }
      const ol = await sppListOrderLines(t.id);
      const bundle = await sppLoadBundle(t.id, ol.map((r) => r.id));
      setLines(
        ol.map((r) => {
          const b = bundle.get(r.id);
          if (b) return b;
          return {
            ...r,
            monthly: null,
            weeklyPlans: new Map(),
            weeklyActuals: new Map(),
            variance: new Map(),
          };
        })
      );
      setTableEpoch((e) => e + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [actor, yearMonth, productLine]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!tracker) {
      setAuditImports([]);
      return;
    }
    void sppListPipelineImports(tracker.id)
      .then(setAuditImports)
      .catch(() => setAuditImports([]));
  }, [tracker, tableEpoch]);

  async function onOpenOrCreate() {
    if (!actor || !canWrite) return;
    setLoading(true);
    try {
      const t = await sppEnsureTracker(actor, yearMonth, productLine);
      setTracker(t);
      await refresh();
      toast.success("Tracker ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open tracker");
    } finally {
      setLoading(false);
    }
  }

  async function onSplitEvenly(lineId: string) {
    if (!actor || !canWrite) return;
    const b = lines.find((x) => x.id === lineId);
    const tgt = b?.monthly?.target_qty ?? b?.ordered_qty ?? null;
    if (tgt == null || !weeks.length) {
      toast.message("Set a monthly target qty first (or ordered qty on the line).");
      return;
    }
    const parts = distributeQtyAcrossWeeks(tgt, weeks.length);
    setLoading(true);
    try {
      for (let i = 0; i < weeks.length; i++) {
        const w = weeks[i]!;
        await sppUpsertWeeklyPlan(actor, lineId, w, parts[i] ?? 0, null);
      }
      await refresh();
      toast.success("Weekly plan split from monthly target");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Split failed");
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    const perWeek: { plan: number; act: number }[] = weeks.map(() => ({ plan: 0, act: 0 }));
    for (const ln of displayLines) {
      weeks.forEach((w, i) => {
        const p = ln.weeklyPlans.get(w)?.planned_qty ?? 0;
        const a = ln.weeklyActuals.get(w)?.actual_qty ?? 0;
        perWeek[i]!.plan += Number(p) || 0;
        perWeek[i]!.act += Number(a) || 0;
      });
    }
    return perWeek;
  }, [displayLines, weeks]);

  const deviationRollup = useMemo(() => sppRollupDeviationReasons(displayLines), [displayLines]);

  const [varianceOpen, setVarianceOpen] = useState<{
    lineId: string;
    week: string;
    text: string;
    reasons: SppDeviationReason[];
  } | null>(null);

  async function saveVariance() {
    if (!actor || !canWrite || !varianceOpen) return;
    setLoading(true);
    try {
      await sppUpsertVarianceNote(
        actor,
        varianceOpen.lineId,
        varianceOpen.week,
        varianceOpen.text || null,
        varianceOpen.reasons
      );
      setVarianceOpen(null);
      await refresh();
      toast.success("Analysis saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Sales &amp; production planning</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Import opening pipeline from the ERP sales order pipeline report (columns A–F: order, delivery date,
          customer, product code, item, ordered qty). Set monthly targets from the pipeline, split to weeks, then
          record actual deliveries and variance analysis. Lines added mid-month are flagged as ad-hoc (not from the
          opening snapshot).
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tracker</CardTitle>
          <CardDescription>
            Separate Yarn vs Weaving views — match the spreadsheet tabs. Use CSV or tab-separated paste from ERP.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="spp-month">Month</Label>
            <Input
              id="spp-month"
              type="month"
              className="w-[11rem]"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Product line</Label>
            <Select value={productLine} onValueChange={(v) => setProductLine(v as SppProductLine)}>
              <SelectTrigger className="w-[10rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yarn">Yarn</SelectItem>
                <SelectItem value="weaving">Weaving</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {canWrite ? (
            <Button type="button" className="transition-all duration-200" onClick={() => void onOpenOrCreate()}>
              Open / create tracker
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Read-only (sales and operations roles including super admin can edit).
            </p>
          )}
          {tracker && canWrite && actor ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => setImportOpeningOpen(true)}>
                  Import opening pipeline…
                </Button>
                <Button type="button" variant="outline" onClick={() => setImportMoreOpen(true)}>
                  Import additional rows…
                </Button>
              </div>
              <PlanningImportDialog
                open={importOpeningOpen}
                onOpenChange={setImportOpeningOpen}
                trackerId={tracker.id}
                actor={actor}
                isOpeningSnapshot
                onImported={() => void refresh()}
              />
              <PlanningImportDialog
                open={importMoreOpen}
                onOpenChange={setImportMoreOpen}
                trackerId={tracker.id}
                actor={actor}
                isOpeningSnapshot={false}
                onImported={() => void refresh()}
              />
            </>
          ) : null}
        </CardContent>
      </Card>

      {tracker ? (
        <>
          <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as typeof viewTab)} className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-1 print:hidden">
              <TabsTrigger value="detail" className="transition-all duration-200">
                Detail (weekly)
              </TabsTrigger>
              <TabsTrigger value="summary" className="transition-all duration-200">
                Month summary
              </TabsTrigger>
              <TabsTrigger value="executive" className="transition-all duration-200">
                Executive
              </TabsTrigger>
            </TabsList>

            <TabsContent value="detail" className="space-y-4 mt-0 print:hidden">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="spp-adhoc-only"
                    checked={adHocOnly}
                    onCheckedChange={(c) => setAdHocOnly(c === true)}
                  />
                  <Label htmlFor="spp-adhoc-only" className="text-sm font-normal cursor-pointer">
                    Ad-hoc lines only
                  </Label>
                </div>
                <span
                  className="text-xs text-muted-foreground"
                  title="Mid-month orders not from the opening pipeline snapshot are flagged for executive reporting."
                >
                  Ad-hoc lines are orders received or delivered during the month outside the opening snapshot.
                </span>
              </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Order lines &amp; weekly plan / actual</CardTitle>
              <CardDescription>
                {loading ? "Loading…" : `${lines.length} line(s) total, ${displayLines.length} shown.`} Ad-hoc lines
                show a badge. Use analysis to tag deviation drivers (materials, equipment, labour, holidays,
                planning).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full max-h-[min(70vh,720px)]">
                <Table key={tableEpoch}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10 bg-card min-w-[7rem]">Order</TableHead>
                      <TableHead className="min-w-[6rem]">Del</TableHead>
                      <TableHead className="min-w-[8rem]">Customer</TableHead>
                      <TableHead className="min-w-[5rem]">Code</TableHead>
                      <TableHead className="min-w-[10rem]">Item</TableHead>
                      <TableHead className="text-right min-w-[5rem]">Ord</TableHead>
                      <TableHead className="min-w-[4rem]">UoM</TableHead>
                      <TableHead className="text-right min-w-[6rem]">Mth tgt qty</TableHead>
                      <TableHead className="text-right min-w-[7rem]">Mth tgt R</TableHead>
                      <TableHead className="min-w-[6rem]">Actions</TableHead>
                      {weeks.flatMap((w) => [
                        <TableHead key={`p-${w}`} className="text-right text-xs whitespace-nowrap min-w-[5rem]">
                          Plan {w.slice(8)}
                        </TableHead>,
                        <TableHead key={`a-${w}`} className="text-right text-xs whitespace-nowrap min-w-[5rem]">
                          Act {w.slice(8)}
                        </TableHead>,
                        <TableHead key={`n-${w}`} className="min-w-[4rem] text-center text-xs">
                          Var
                        </TableHead>,
                      ])}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayLines.map((ln) => (
                      <TableRow key={ln.id}>
                        <TableCell className="sticky left-0 z-10 bg-card font-mono text-xs">
                          <div className="flex flex-wrap items-center gap-1">
                            {ln.erp_order_ref}
                            {ln.is_ad_hoc ? (
                              <Badge variant="secondary" className="text-[10px]">
                                Ad-hoc
                              </Badge>
                            ) : null}
                            {!ln.from_opening_pipeline && !ln.is_ad_hoc ? (
                              <Badge variant="outline" className="text-[10px]">
                                Not opening
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{ln.del_date ?? "—"}</TableCell>
                        <TableCell className="text-xs max-w-[10rem] truncate">{ln.customer_name ?? "—"}</TableCell>
                        <TableCell className="text-xs">{ln.pcode ?? "—"}</TableCell>
                        <TableCell className="text-xs max-w-[14rem] truncate">{ln.item_description ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs">{ln.ordered_qty ?? "—"}</TableCell>
                        <TableCell className="text-xs">{ln.uom ?? "—"}</TableCell>
                        <TableCell className="p-1">
                          <Input
                            className="h-8 text-right font-mono text-xs"
                            defaultValue={ln.monthly?.target_qty ?? ""}
                            disabled={!canWrite}
                            onBlur={async (e) => {
                              if (!actor || !canWrite) return;
                              const v = e.target.value.trim();
                              const n = v === "" ? null : Number(v);
                              try {
                                await sppUpsertMonthlyTarget(actor, ln.id, n, ln.monthly?.target_value_zar ?? null);
                                await refresh();
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Save failed");
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            className="h-8 text-right font-mono text-xs"
                            defaultValue={ln.monthly?.target_value_zar ?? ""}
                            disabled={!canWrite}
                            onBlur={async (e) => {
                              if (!actor || !canWrite) return;
                              const v = e.target.value.trim();
                              const n = v === "" ? null : Number(v);
                              try {
                                await sppUpsertMonthlyTarget(actor, ln.id, ln.monthly?.target_qty ?? null, n);
                                await refresh();
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Save failed");
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {canWrite ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs h-8"
                              onClick={() => void onSplitEvenly(ln.id)}
                            >
                              Split wks
                            </Button>
                          ) : null}
                        </TableCell>
                        {weeks.flatMap((w) => {
                          const plan = ln.weeklyPlans.get(w)?.planned_qty ?? "";
                          const act = ln.weeklyActuals.get(w)?.actual_qty ?? "";
                          const pv = Number(plan) || 0;
                          const av = Number(act) || 0;
                          return [
                            <TableCell key={`p-${ln.id}-${w}`} className="p-1">
                              <Input
                                className="h-8 text-right font-mono text-xs"
                                defaultValue={plan === "" ? "" : String(plan)}
                                disabled={!canWrite}
                                onBlur={async (e) => {
                                  if (!actor || !canWrite) return;
                                  const v = e.target.value.trim();
                                  const n = v === "" ? null : Number(v);
                                  try {
                                    await sppUpsertWeeklyPlan(actor, ln.id, w, n, null);
                                    await refresh();
                                  } catch (err) {
                                    toast.error(err instanceof Error ? err.message : "Save failed");
                                  }
                                }}
                              />
                            </TableCell>,
                            <TableCell key={`a-${ln.id}-${w}`} className="p-1">
                              <Input
                                className="h-8 text-right font-mono text-xs"
                                defaultValue={act === "" ? "" : String(act)}
                                disabled={!canWrite}
                                onBlur={async (e) => {
                                  if (!actor || !canWrite) return;
                                  const v = e.target.value.trim();
                                  const n = v === "" ? null : Number(v);
                                  try {
                                    await sppUpsertWeeklyActual(actor, ln.id, w, n, null);
                                    await refresh();
                                  } catch (err) {
                                    toast.error(err instanceof Error ? err.message : "Save failed");
                                  }
                                }}
                              />
                            </TableCell>,
                            <TableCell key={`v-${ln.id}-${w}`} className="text-center p-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => {
                                  const vn = ln.variance.get(w);
                                  setVarianceOpen({
                                    lineId: ln.id,
                                    week: w,
                                    text: vn?.analysis_text ?? "",
                                    reasons: vn?.deviation_reasons?.length ? [...vn.deviation_reasons] : [],
                                  });
                                }}
                              >
                                {pv || av ? (
                                  <span
                                    className={cn(
                                      "font-mono",
                                      av - pv < 0 ? "text-destructive" : "text-muted-foreground"
                                    )}
                                  >
                                    {(av - pv).toFixed(1)}
                                  </span>
                                ) : (
                                  "…"
                                )}
                              </Button>
                            </TableCell>,
                          ];
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>

          {canWrite ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ad-hoc line (mid-month)</CardTitle>
                <CardDescription>
                  Orders received during the month that were not on the opening pipeline — tracked for analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 items-end">
                <AdHocForm trackerId={tracker.id} actor={actor!} onDone={() => void refresh()} />
              </CardContent>
            </Card>
          ) : null}
            </TabsContent>

            <TabsContent value="summary" className="mt-0 space-y-4 print:hidden">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Month summary (no weekly columns)</CardTitle>
                  <CardDescription>
                    Rolled-up planned vs actual for the month — same data as the Excel month rollup view.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="w-full max-h-[min(60vh,560px)]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Ad-hoc</TableHead>
                          <TableHead className="text-right">Mth tgt qty</TableHead>
                          <TableHead className="text-right">Σ plan</TableHead>
                          <TableHead className="text-right">Σ actual</TableHead>
                          <TableHead className="text-right">Var</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayLines.map((ln) => {
                          const { sumP, sumA } = monthRollupQty(ln, weeks);
                          return (
                            <TableRow key={ln.id}>
                              <TableCell className="font-mono text-xs">{ln.erp_order_ref}</TableCell>
                              <TableCell className="text-xs max-w-[10rem] truncate">{ln.customer_name ?? "—"}</TableCell>
                              <TableCell className="text-xs max-w-[14rem] truncate">{ln.item_description ?? "—"}</TableCell>
                              <TableCell>{ln.is_ad_hoc ? "yes" : "no"}</TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {ln.monthly?.target_qty ?? "—"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">{sumP}</TableCell>
                              <TableCell className="text-right font-mono text-xs">{sumA}</TableCell>
                              <TableCell
                                className={cn(
                                  "text-right font-mono text-xs",
                                  sumA - sumP < 0 ? "text-destructive" : ""
                                )}
                              >
                                {sumA - sumP}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="executive" className="mt-0 space-y-4">
              <div id="spp-print-area" className="space-y-4 print:space-y-2">
                <Card>
                  <CardHeader className="pb-2 flex flex-row flex-wrap items-start justify-between gap-2 print:pb-1">
                    <div>
                      <CardTitle className="text-base">Executive summary (volumes)</CardTitle>
                      <CardDescription>
                        Planned vs actual totals by week — filter applies to this view and exports.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2 no-print">
                      <Button
                        type="button"
                        variant="outline"
                        className="transition-all duration-200"
                        onClick={() =>
                          sppDownloadExecutiveCsv({
                            yearMonth: tracker.year_month,
                            productLine,
                            weeks,
                            lines: displayLines,
                            weeklySummary: summary,
                          })
                        }
                      >
                        Download CSV
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="transition-all duration-200"
                        onClick={() => {
                          setViewTab("executive");
                          setTimeout(() => window.print(), 250);
                        }}
                      >
                        Print
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[8rem]">Metric</TableHead>
                            {weeks.map((w) => (
                              <TableHead key={w} className="text-right whitespace-nowrap">
                                Week {w.slice(5)}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>Planned qty</TableCell>
                            {summary.map((s, i) => (
                              <TableCell key={i} className="text-right font-mono text-sm">
                                {s.plan.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell>Actual qty</TableCell>
                            {summary.map((s, i) => (
                              <TableCell key={i} className="text-right font-mono text-sm">
                                {s.act.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell>Variance</TableCell>
                            {summary.map((s, i) => (
                              <TableCell
                                key={i}
                                className={cn(
                                  "text-right font-mono text-sm",
                                  s.act - s.plan < 0 ? "text-destructive" : "text-muted-foreground"
                                )}
                              >
                                {(s.act - s.plan).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableBody>
                      </Table>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Deviation analysis (roll-up)</CardTitle>
                    <CardDescription>Counts of tagged reasons across weekly variance notes (current filter).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reason</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!Object.values(deviationRollup).some((v) => (v ?? 0) > 0) ? (
                          <TableRow>
                            <TableCell colSpan={2} className="text-sm text-muted-foreground">
                              No deviation tags yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          (Object.entries(deviationRollup) as [string, number][])
                            .filter(([, v]) => v > 0)
                            .map(([k, v]) => (
                              <TableRow key={k}>
                                <TableCell className="text-sm">{REASON_LABEL[k as SppDeviationReason] ?? k}</TableCell>
                                <TableCell className="text-right font-mono">{v}</TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Pipeline import audit</CardTitle>
                    <CardDescription>Recorded imports for this tracker (`spp_pipeline_import`).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {auditImports.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No imports yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>When</TableHead>
                            <TableHead>File</TableHead>
                            <TableHead className="text-right">Rows</TableHead>
                            <TableHead>Opening snapshot</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {auditImports.map((im) => (
                            <TableRow key={im.id}>
                              <TableCell className="text-xs whitespace-nowrap">
                                {new Date(im.created_at).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-xs max-w-[12rem] truncate">{im.file_name}</TableCell>
                              <TableCell className="text-right font-mono text-xs">{im.row_count}</TableCell>
                              <TableCell className="text-xs">{im.is_opening_snapshot ? "yes" : "no"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <div className="no-print">
            <PlanningWorkforcePanel yearMonth={tracker.year_month} role={profile?.role} />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Choose month and line, then open or create a tracker to begin.
        </p>
      )}

      <Dialog open={!!varianceOpen} onOpenChange={(o) => !o && setVarianceOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Variance analysis</DialogTitle>
          </DialogHeader>
          {varianceOpen ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Week starting {varianceOpen.week}</p>
              <div className="space-y-2">
                <Label>Deviation factors</Label>
                <div className="flex flex-wrap gap-2">
                  {SPP_DEVIATION_REASONS.map((r) => {
                    const on = varianceOpen.reasons.includes(r);
                    return (
                      <Button
                        key={r}
                        type="button"
                        size="sm"
                        variant={on ? "default" : "outline"}
                        className="text-xs h-8 transition-all duration-200"
                        onClick={() =>
                          setVarianceOpen((prev) => {
                            if (!prev) return prev;
                            const next = new Set(prev.reasons);
                            if (next.has(r)) next.delete(r);
                            else next.add(r);
                            return { ...prev, reasons: [...next] as SppDeviationReason[] };
                          })
                        }
                      >
                        {REASON_LABEL[r]}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="var-txt">Comments &amp; action plan</Label>
                <Textarea
                  id="var-txt"
                  value={varianceOpen.text}
                  onChange={(e) => setVarianceOpen((p) => (p ? { ...p, text: e.target.value } : p))}
                  rows={4}
                  placeholder="e.g. Await imported yarn; follow up with supplier…"
                  className="transition-all duration-200"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVarianceOpen(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveVariance()} disabled={loading || !canWrite}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function monthRollupQty(ln: SppLineBundle, weeks: string[]) {
  let sumP = 0;
  let sumA = 0;
  for (const w of weeks) {
    sumP += Number(ln.weeklyPlans.get(w)?.planned_qty ?? 0) || 0;
    sumA += Number(ln.weeklyActuals.get(w)?.actual_qty ?? 0) || 0;
  }
  return { sumP, sumA };
}

function AdHocForm({
  trackerId,
  actor,
  onDone,
}: {
  trackerId: string;
  actor: CrmActor;
  onDone: () => void;
}) {
  const [order, setOrder] = useState("");
  const [customer, setCustomer] = useState("");
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!order.trim()) {
      toast.error("Order reference required");
      return;
    }
    const row: ParsedPipelineRow = {
      erp_order_ref: order.trim(),
      line_key: `${order.trim()}::ad-hoc`,
      customer_name: customer || null,
      pcode: null,
      item_description: item || null,
      ordered_qty: qty === "" ? null : Number(qty),
      uom: null,
      del_date: null,
      unit_price: null,
      deliver_qty: null,
      balance_qty: null,
    };
    setBusy(true);
    try {
      await sppAddAdHocLine(actor, trackerId, row);
      toast.success("Ad-hoc line added");
      setOrder("");
      setCustomer("");
      setItem("");
      setQty("");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Input placeholder="Order ref (ERP)" value={order} onChange={(e) => setOrder(e.target.value)} className="max-w-[10rem]" />
      <Input placeholder="Customer" value={customer} onChange={(e) => setCustomer(e.target.value)} className="max-w-[12rem]" />
      <Input placeholder="Item" value={item} onChange={(e) => setItem(e.target.value)} className="max-w-[14rem]" />
      <Input
        placeholder="Qty"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        className="max-w-[6rem]"
        type="number"
      />
      <Button type="button" onClick={() => void submit()} disabled={busy} className="transition-all duration-200">
        Add ad-hoc line
      </Button>
    </>
  );
}
