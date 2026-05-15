import { useMemo } from "react";
import { DollarSign, TrendingUp, TrendingDown, PieChart, Globe, MapPin, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../components/ui/utils";
import { PageHeader, LastUpdated } from "../components/CrmPageUtils";

const zar = (n: number) => `R ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function FinancialDashboardPage() {
  const data = useMemo(() => ({
    revenueMTD: 18_500_000,
    revenueTarget: 22_000_000,
    grossMargin: 38.4,
    costPerKgYarn: 38.20,
    costPerKgFabric: 52.80,
    exportPct: 62,
    localPct: 38,
    orderCount: 84,
    avgOrderValue: 220_238,
  }), []);

  const productLines = useMemo(() => [
    { name: "Conveyor Belt Fabrics", revenue: 6_800_000, margin: 42.1, growth: "+5.2" },
    { name: "Technical Fabrics", revenue: 4_200_000, margin: 38.5, growth: "+3.8" },
    { name: "Agricultural Fabrics", revenue: 3_100_000, margin: 35.2, growth: "-1.4" },
    { name: "Cleaning & Mob Head", revenue: 2_400_000, margin: 40.8, growth: "+7.1" },
    { name: "Filter Press Fabrics", revenue: 2_000_000, margin: 36.0, growth: "+2.3" },
  ], []);

  const exportMarkets = useMemo(() => [
    { region: "SADC", pct: 38, value: 7_030_000 },
    { region: "East Africa", pct: 12, value: 2_220_000 },
    { region: "West Africa", pct: 7, value: 1_295_000 },
    { region: "Europe", pct: 3, value: 555_000 },
    { region: "Other", pct: 2, value: 370_000 },
  ], []);

  const recentOrders = useMemo(() => [
    { id: "SO-24105", customer: "Anglo American", product: "EP 500 Conveyor", value: 845_000, margin: 41.2, status: "delivered" as const },
    { id: "SO-24106", customer: "SASOL Mining", product: "Filter Press Fabric", value: 620_000, margin: 36.8, status: "shipping" as const },
    { id: "SO-24107", customer: "Pioneer Foods", product: "Agricultural Shade", value: 385_000, margin: 38.5, status: "production" as const },
    { id: "SO-24108", customer: "Pick n Pay", product: "Mob Head Fabric", value: 290_000, margin: 42.0, status: "production" as const },
    { id: "SO-24109", customer: "Eskom", product: "Technical Fabric", value: 175_000, margin: 35.5, status: "planning" as const },
  ], []);

  const statusStyles = { delivered: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600", shipping: "border-blue-500/30 bg-blue-500/10 text-blue-600", production: "border-amber-500/30 bg-amber-500/10 text-amber-600", planning: "border-slate-500/30 bg-slate-500/10 text-slate-600" };

  return (
    <div className="space-y-6 pb-12" data-gsap-section>
      <PageHeader title="Financial & Sales Dashboard" description="Revenue, margins, and sales performance across product lines"
        icon={<DollarSign className="size-5 text-emerald-600" />} iconBg="bg-emerald-50 border-emerald-200/70"
        breadcrumbs={[{ label: "CRM" }, { label: "Financials" }]} />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Revenue (MTD)", value: zar(data.revenueMTD), sub: `Target ${zar(data.revenueTarget)}`, icon: <TrendingUp className="size-5 text-emerald-600" />, pct: Math.round((data.revenueMTD / data.revenueTarget) * 100), color: "emerald" as const },
          { label: "Gross Margin", value: `${data.grossMargin}%`, sub: "Weighted avg all lines", icon: <PieChart className="size-5 text-blue-600" />, pct: data.grossMargin, color: "blue" as const },
          { label: "Cost per kg (Yarn)", value: `R${data.costPerKgYarn.toFixed(2)}`, sub: "Spinning & twisting", icon: <Package className="size-5 text-amber-600" />, pct: 65, color: "amber" as const },
          { label: "Cost per kg (Fabric)", value: `R${data.costPerKgFabric.toFixed(2)}`, sub: "Weaving & finishing", icon: <Package className="size-5 text-violet-600" />, pct: 75, color: "violet" as const },
        ].map(k => (
          <div key={k.label} data-gsap-kpi className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.sub}</p>
              </div>
              <div className="size-9 rounded-lg border bg-muted/20 flex items-center justify-center shrink-0">{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by product line */}
        <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-500/30 via-[#D4AF37] to-emerald-500/30" />
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-sm font-semibold">Revenue by Product Line</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {productLines.map(p => {
              const pct = Math.round((p.revenue / data.revenueMTD) * 100);
              return (
                <div key={p.name} className="space-y-1.5">
                  <div className="flex justify-between text-sm"><span>{p.name}</span><span className="font-mono font-semibold">{zar(p.revenue)}</span></div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#D4AF37]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Margin: {p.margin}%</span>
                    <span className={cn("font-medium", p.growth.startsWith("+") ? "text-emerald-600" : "text-rose-600")}>{p.growth}%</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Export vs Local */}
        <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500/30 via-[#D4AF37] to-blue-500/30" />
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Globe className="size-4" /> Export vs Local Sales</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Export</p>
                <p className="text-3xl font-bold text-blue-600">{data.exportPct}%</p>
                <p className="text-xs text-muted-foreground">{zar(data.revenueMTD * data.exportPct / 100)}</p>
              </div>
              <div className="flex-1 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Local</p>
                <p className="text-3xl font-bold text-emerald-600">{data.localPct}%</p>
                <p className="text-xs text-muted-foreground">{zar(data.revenueMTD * data.localPct / 100)}</p>
              </div>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">Export Markets</p>
            {exportMarkets.map(m => (
              <div key={m.region} className="flex items-center gap-3">
                <MapPin className="size-3 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs"><span>{m.region}</span><span className="font-mono">{m.pct}% · {zar(m.value)}</span></div>
                  <div className="h-1.5 rounded-full bg-muted mt-0.5 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500/30 via-[#D4AF37] to-amber-500/30" />
        <CardHeader className="border-b bg-muted/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Orders</CardTitle>
            <Badge variant="outline" className="text-[10px]">{data.orderCount} orders MTD · Avg {zar(data.avgOrderValue)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20 [&>th]:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:text-muted-foreground [&>th]:px-4 [&>th]:py-3 [&>th]:text-left">
                  <th>Order</th><th>Customer</th><th>Product</th><th className="text-right">Value</th><th className="text-right">Margin</th><th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors [&>td]:px-4 [&>td]:py-3">
                    <td className="font-mono text-xs">{o.id}</td>
                    <td>{o.customer}</td>
                    <td className="text-xs text-muted-foreground">{o.product}</td>
                    <td className="text-right font-mono font-semibold">{zar(o.value)}</td>
                    <td className="text-right font-mono">{o.margin}%</td>
                    <td className="text-right"><Badge variant="outline" className={cn("text-[10px]", statusStyles[o.status])}>{o.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
          <LastUpdated />
    </div>
  );
}




