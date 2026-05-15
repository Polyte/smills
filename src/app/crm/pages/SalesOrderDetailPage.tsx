import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getSalesOrder, updateSalesOrderStatus, type SalesOrderRow } from "../../../lib/crm/factoryRepo";
import {
  fetchLatestMachines,
  isAutomationApiConfigured,
  type MachineTelemetryRow,
} from "../../../lib/automationApi";
import { MachineTelemetryStrip } from "../components/MachineTelemetryStrip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "../../components/ui/utils";
import { crmFactoryLinkClass } from "../components/crmDataUi";

const STATUSES: SalesOrderRow["status"][] = [
  "quotation",
  "sample_pending",
  "sample_approved",
  "production",
  "quality_hold",
  "quality_passed",
  "shipping",
  "delivered",
  "cancelled",
];

function SalesOrderDetailSkeleton() {
  return (
    <div className="max-w-3xl space-y-5">
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Card className="overflow-hidden rounded-xl border-border/70">
        <CardHeader className="border-b border-border/40 bg-muted/15">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-full max-w-lg" />
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <Skeleton className="h-10 w-64 max-w-full" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden rounded-xl border-border/70">
        <CardHeader className="border-b border-border/40 bg-muted/15">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="p-5">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function SalesOrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<SalesOrderRow | null>(null);
  const [machines, setMachines] = useState<MachineTelemetryRow[]>([]);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    setOrder(null);
    setInitialLoadDone(false);
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setOrder(await getSalesOrder(id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setInitialLoadDone(true);
    }
    if (isAutomationApiConfigured()) {
      try {
        setMachines(await fetchLatestMachines());
      } catch {
        setMachines([]);
      }
    }
  }, [id]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(t);
  }, [load]);

  if (!id) {
    return <p className="text-sm text-muted-foreground">Missing order.</p>;
  }

  if (!initialLoadDone) {
    return <SalesOrderDetailSkeleton />;
  }

  if (!order) {
    return (
      <div className="max-w-3xl space-y-4">
        <Link to="/crm/orders" className={cn("text-xs", crmFactoryLinkClass)}>
          ← Orders
        </Link>
        <p className="text-sm text-muted-foreground">This order could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6" data-gsap-section>
      <Link to="/crm/orders" className={cn("text-xs", crmFactoryLinkClass)}>
        ← Orders
      </Link>
      <div className="relative isolate overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 px-6 py-5 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-[oklch(0.45_0.14_265)] via-[#D4AF37] via-60% to-[oklch(0.45_0.14_265)]" />
        <div className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-[radial-gradient(circle,#D4AF37/0.06),transparent_65%)] blur-2xl" />
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-sky-200/70 bg-sky-50 shadow-sm">
            <span className="font-mono text-lg font-bold text-sky-600">#</span>
          </div>
          <div>
            <h1 className="font-display font-mono text-2xl font-bold tracking-tight text-foreground">{order.order_number}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Fabric order — tie-in to live production telemetry</p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden rounded-xl border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/40 bg-muted/15 pb-3">
          <CardTitle className="text-base text-foreground">Workflow</CardTitle>
          <CardDescription>
            Moving to &quot;quality passed&quot; triggers automation (shipping task draft).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <Select
            value={order.status}
            onValueChange={(v) => {
              void updateSalesOrderStatus(order.id, v as SalesOrderRow["status"])
                .then(() => {
                  toast.success("Status updated");
                  void load();
                })
                .catch((e) => toast.error(e instanceof Error ? e.message : "Update failed"));
            }}
          >
            <SelectTrigger className="w-full max-w-xs min-h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {[
              { label: "Fabric", value: order.fabric_type ?? "—" },
              { label: "GSM / width", value: `${order.gsm ?? "—"} / ${order.width_cm ?? "—"} cm` },
              { label: "Color / finish", value: `${order.color ?? "—"} · ${order.finish ?? "—"}` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="mt-0.5 font-medium text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-xl border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/40 bg-muted/15 pb-3">
          <CardTitle className="text-base text-foreground">Live machines</CardTitle>
          <CardDescription>Same telemetry stream as the automation hub — contextual to operations.</CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <MachineTelemetryStrip machines={machines} />
        </CardContent>
      </Card>
    </div>
  );
}

