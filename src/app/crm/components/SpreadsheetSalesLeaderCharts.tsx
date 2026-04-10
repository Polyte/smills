"use client";

import { useMemo } from "react";
import type { TooltipProps } from "recharts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { useSpreadsheetOrders } from "../context/SpreadsheetOrdersContext";
import { useCrmAuth } from "../CrmAuthContext";
import { canViewSpreadsheetLedgerAnalytics } from "../../../lib/crm/roles";
import {
  deliveryStatusBreakdown,
  revenueByOrderMonth,
  topCustomersByGrandTotal,
} from "../../../lib/crm/spreadsheetOrdersChartData";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const money = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

function LedgerTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/80 bg-popover/95 px-3 py-2.5 text-sm shadow-lg backdrop-blur-sm">
      {label != null && label !== "" ? (
        <p className="mb-1.5 font-semibold leading-tight text-foreground">{String(label)}</p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-baseline justify-between gap-6 tabular-nums">
            <span className="text-muted-foreground">{p.name}</span>
            <span className="font-semibold text-foreground">
              {typeof p.value === "number" ? money.format(p.value) : p.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PieTooltipBody({
  active,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const name = String(p.name ?? "");
  const value = typeof p.value === "number" ? p.value : 0;
  const total = payload[0]?.payload?.totalCount ?? value;
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-border/80 bg-popover/95 px-3 py-2.5 text-sm shadow-lg backdrop-blur-sm">
      <p className="font-semibold text-foreground">{name}</p>
      <p className="mt-1 tabular-nums text-muted-foreground">
        <span className="font-medium text-foreground">{value}</span> lines · {pct}% of total
      </p>
    </div>
  );
}

export function SpreadsheetSalesLeaderCharts() {
  const { profile } = useCrmAuth();
  const { rows, ready } = useSpreadsheetOrders();
  const show = canViewSpreadsheetLedgerAnalytics(profile?.role);

  const byMonth = useMemo(() => revenueByOrderMonth(rows), [rows]);
  const byStatusRaw = useMemo(() => deliveryStatusBreakdown(rows), [rows]);
  const byStatus = useMemo(() => {
    const totalCount = byStatusRaw.reduce((s, x) => s + x.value, 0);
    return byStatusRaw.map((x) => ({ ...x, totalCount }));
  }, [byStatusRaw]);
  const byCustomer = useMemo(() => topCustomersByGrandTotal(rows, 10), [rows]);

  if (!show) return null;
  if (!ready) return null;

  const monthTickInterval = byMonth.length > 8 ? Math.floor(byMonth.length / 6) : 0;

  return (
    <section
      id="ledger-export-charts"
      className="space-y-4 rounded-2xl border border-border/60 bg-gradient-to-b from-card/90 via-card/70 to-muted/20 p-4 shadow-md ring-1 ring-black/[0.03] backdrop-blur-sm dark:ring-white/[0.04] md:p-6"
      aria-label="Sales ledger analytics"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-border/50 pb-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
          <BarChart3 className="size-5" aria-hidden />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground md:text-xl">
            Analytics overview
          </h2>
          <p className="text-sm text-muted-foreground">
            Supervisor & admin · revenue, delivery mix, and top customers ({rows.length} lines)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden rounded-xl border-border/70 bg-background/90 shadow-sm transition-all duration-200 hover:shadow-md lg:col-span-2">
          <CardHeader className="space-y-1 border-b border-border/40 bg-muted/20 pb-3">
            <CardTitle className="text-base font-semibold">Revenue by order month</CardTitle>
            <CardDescription>Sum of grand total · order date</CardDescription>
          </CardHeader>
          <CardContent className="h-[min(22rem,50vh)] min-h-[240px] pt-4">
            {byMonth.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No dated revenue to chart.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMonth} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
                  <defs>
                    <linearGradient id="ledgerRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.55} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} className="stroke-border/50" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ className: "stroke-border/60" }}
                    interval={monthTickInterval}
                    angle={byMonth.length > 6 ? -20 : 0}
                    textAnchor={byMonth.length > 6 ? "end" : "middle"}
                    height={byMonth.length > 6 ? 52 : 28}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${v}`)}
                    width={48}
                  />
                  <Tooltip content={<LedgerTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.35)" }} />
                  <Bar
                    dataKey="total"
                    name="Grand total"
                    radius={[8, 8, 4, 4]}
                    fill="url(#ledgerRevenueGrad)"
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-xl border-border/70 bg-background/90 shadow-sm transition-all duration-200 hover:shadow-md">
          <CardHeader className="space-y-1 border-b border-border/40 bg-muted/20 pb-3">
            <CardTitle className="text-base font-semibold">Delivery status mix</CardTitle>
            <CardDescription>Share of line items</CardDescription>
          </CardHeader>
          <CardContent className="h-[min(22rem,50vh)] min-h-[240px] pt-4">
            {byStatus.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="42%"
                    outerRadius="72%"
                    paddingAngle={3}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {byStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltipBody />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-xl border-border/70 bg-background/90 shadow-sm transition-all duration-200 hover:shadow-md lg:col-span-3">
          <CardHeader className="space-y-1 border-b border-border/40 bg-muted/20 pb-3">
            <CardTitle className="text-base font-semibold">Top customers by grand total</CardTitle>
            <CardDescription>Highest revenue customers · top 10</CardDescription>
          </CardHeader>
          <CardContent className="h-[min(20rem,45vh)] min-h-[220px] pt-4">
            {byCustomer.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No totals to compare.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byCustomer}
                  layout="vertical"
                  margin={{ top: 8, right: 20, left: 4, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id="ledgerCustomerGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.65} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" horizontal={false} className="stroke-border/50" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ className: "stroke-border/60" }}
                    tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${v}`)}
                  />
                  <YAxis
                    type="category"
                    dataKey="customer"
                    width={148}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (String(v).length > 24 ? `${String(v).slice(0, 22)}…` : String(v))}
                  />
                  <Tooltip content={<LedgerTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.25)" }} />
                  <Bar
                    dataKey="total"
                    name="Grand total"
                    radius={[0, 8, 8, 0]}
                    fill="url(#ledgerCustomerGrad)"
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
