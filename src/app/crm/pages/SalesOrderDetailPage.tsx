import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getSalesOrder, updateSalesOrderStatus, type SalesOrderRow } from "../../../lib/crm/factoryRepo";
import {
  fetchLatestMachines,
  isAutomationApiConfigured,
  type MachineTelemetryRow,
} from "../../../lib/automationApi";
import { MachineTelemetryStrip } from "../components/MachineTelemetryStrip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from "sonner";

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

export function SalesOrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<SalesOrderRow | null>(null);
  const [machines, setMachines] = useState<MachineTelemetryRow[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setOrder(await getSalesOrder(id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
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

  if (!order) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Link to="/crm/orders" className="text-xs font-medium text-primary hover:underline">
        ← Orders
      </Link>
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight font-mono">{order.order_number}</h1>
        <p className="text-sm text-muted-foreground">Fabric order — tie-in to live production telemetry</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Workflow</CardTitle>
          <CardDescription>Moving to “quality passed” triggers automation (shipping task draft).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
            <SelectTrigger className="w-64">
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
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Fabric</p>
              <p className="font-medium">{order.fabric_type ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">GSM / width</p>
              <p className="font-medium">
                {order.gsm ?? "—"} / {order.width_cm ?? "—"} cm
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Color / finish</p>
              <p className="font-medium">
                {order.color ?? "—"} · {order.finish ?? "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Live machines</CardTitle>
          <CardDescription>Same telemetry stream as the automation hub — contextual to operations.</CardDescription>
        </CardHeader>
        <CardContent>
          <MachineTelemetryStrip machines={machines} />
        </CardContent>
      </Card>
    </div>
  );
}
