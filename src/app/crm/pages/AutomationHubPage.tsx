import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useCrmAuth } from "../CrmAuthContext";
import { crmUsesSupabase } from "../../../lib/crm/crmRepo";
import {
  listAutomationEvents,
  listPendingAutomationActions,
  updateAutomationAction,
  type AutomationEventRow,
} from "../../../lib/crm/factoryRepo";
import {
  fetchLatestMachines,
  fetchMachineSeries,
  isAutomationApiConfigured,
  type MachineTelemetryRow,
} from "../../../lib/automationApi";
import { MachineTelemetryStrip } from "../components/MachineTelemetryStrip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { subHours, format } from "date-fns";
import { QcDefectGallery } from "../components/QcDefectGallery";

export function AutomationHubPage() {
  const { user, profile } = useCrmAuth();
  const [machines, setMachines] = useState<MachineTelemetryRow[]>([]);
  const [events, setEvents] = useState<AutomationEventRow[]>([]);
  const [pending, setPending] = useState<Awaited<ReturnType<typeof listPendingAutomationActions>>>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [seriesMachine, setSeriesMachine] = useState<string | null>(null);
  const [series, setSeries] = useState<MachineTelemetryRow[]>([]);

  const load = useCallback(async () => {
    if (isAutomationApiConfigured()) {
      try {
        setMachines(await fetchLatestMachines());
      } catch {
        setMachines([]);
      }
    } else setMachines([]);

    if (!crmUsesSupabase() || !user) {
      setEvents([]);
      setPending([]);
      return;
    }
    try {
      const ev = await listAutomationEvents({
        from: from.trim() || undefined,
        to: to.trim() || undefined,
        orderNumber: orderFilter.trim() || undefined,
      });
      setEvents(ev);
      setPending(await listPendingAutomationActions());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load automation data");
    }
  }, [user, from, to, orderFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!seriesMachine || !isAutomationApiConfigured()) {
      setSeries([]);
      return;
    }
    let cancelled = false;
    const t0 = subHours(new Date(), 6);
    void fetchMachineSeries(seriesMachine, t0.toISOString(), new Date().toISOString()).then((s) => {
      if (!cancelled) setSeries(s);
    });
    return () => {
      cancelled = true;
    };
  }, [seriesMachine]);

  const chartData = useMemo(
    () =>
      series.map((r) => ({
        t: r.time ? format(new Date(r.time), "HH:mm:ss") : "",
        eff: r.efficiency_pct,
      })),
    [series]
  );

  const canDecide =
    profile?.role === "admin" ||
    profile?.role === "production_manager" ||
    profile?.role === "quality_officer";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Factory automation hub</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live machine telemetry (Timescale / Docker), timeline events, and workflow actions from Supabase.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Live machines</CardTitle>
          <CardDescription>RPM, efficiency, temperature — updates every few seconds when the simulator is running.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <MachineTelemetryStrip machines={machines} />
          {machines.length > 0 ? (
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Chart machine</Label>
                <select
                  className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={seriesMachine ?? ""}
                  onChange={(e) => setSeriesMachine(e.target.value || null)}
                >
                  <option value="">Select…</option>
                  {machines.map((m) => (
                    <option key={m.machine_id} value={m.machine_id}>
                      {m.machine_id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
          {chartData.length > 0 ? (
            <div className="h-56 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="eff" name="Efficiency %" stroke="hsl(var(--primary))" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-base">Automation timeline</CardTitle>
            <CardDescription>Inventory scanners, workflows, quality — filter by date or order reference.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
            <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
            <Input placeholder="Order # filter" value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)} className="w-36" />
            <Button type="button" variant="secondary" size="sm" onClick={() => void load()}>
              Apply
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border max-h-80 overflow-y-auto">
            {events.length === 0 ? (
              <li className="px-3 py-6 text-sm text-muted-foreground text-center">No events (or Supabase not configured).</li>
            ) : (
              events.map((e) => (
                <li key={e.id} className="px-3 py-2 text-sm">
                  <span className="font-mono text-[10px] text-muted-foreground">{e.event_type}</span>
                  <p className="font-medium">{e.message}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                </li>
              ))
            )}
          </ul>
          <Link to="/crm/automation/insights" className="inline-block mt-3 text-xs font-medium text-primary hover:underline">
            Open automation insights →
          </Link>
        </CardContent>
      </Card>

      {crmUsesSupabase() ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Visual QC defects</CardTitle>
            <CardDescription>Thumbnails from logged inspections (camera uploads or URLs).</CardDescription>
          </CardHeader>
          <CardContent>
            <QcDefectGallery limit={12} title="" />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pending automated actions</CardTitle>
          <CardDescription>Approve, override, or cancel system-suggested tasks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending actions.</p>
          ) : (
            pending.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{p.summary}</p>
                  <p className="text-[10px] text-muted-foreground">{p.action_type} · {p.source}</p>
                </div>
                {canDecide && user ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        void updateAutomationAction(p.id, { status: "applied", decided_by: user.id }).then(() => {
                          toast.success("Marked applied");
                          void load();
                        })
                      }
                    >
                      Apply
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void updateAutomationAction(p.id, { status: "overridden", decided_by: user.id }).then(() => {
                          toast.success("Overridden");
                          void load();
                        })
                      }
                    >
                      Override
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
