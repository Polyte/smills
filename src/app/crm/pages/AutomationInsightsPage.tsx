import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { crmUsesSupabase } from "../../../lib/crm/crmRepo";
import { defectRateLast7Days, listQcInspectionsRecent } from "../../../lib/crm/factoryRepo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { QcDefectGallery } from "../components/QcDefectGallery";

export function AutomationInsightsPage() {
  const [failPct, setFailPct] = useState<number | null>(null);
  const [totalInsp, setTotalInsp] = useState(0);
  const [qcRows, setQcRows] = useState<{ result: string; count: number }[]>([]);

  const load = useCallback(async () => {
    if (!crmUsesSupabase()) return;
    try {
      const d = await defectRateLast7Days();
      setFailPct(d.failPct);
      setTotalInsp(d.total);
      const recent = await listQcInspectionsRecent(7);
      const pass = recent.filter((r) => r.result === "pass").length;
      const fail = recent.filter((r) => r.result === "fail").length;
      const pend = recent.filter((r) => r.result === "pending").length;
      setQcRows([
        { result: "Pass", count: pass },
        { result: "Fail", count: fail },
        { result: "Pending", count: pend },
      ]);
    } catch {
      setFailPct(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Automation insights</h1>
        <p className="text-sm text-muted-foreground mt-1">QC defect trend and summary (last 7 days).</p>
        <Link to="/crm/automation" className="text-xs font-medium text-primary hover:underline inline-block mt-2">
          ← Back to hub
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Defect rate</CardTitle>
            <CardDescription>Failed inspections / total ({totalInsp} checks)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-display font-bold tabular-nums">{failPct != null ? `${failPct}%` : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Result mix</CardTitle>
          </CardHeader>
          <CardContent className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qcRows}>
                <XAxis dataKey="result" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {crmUsesSupabase() ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Defect photo gallery</CardTitle>
            <CardDescription>Recent images attached to QC defect rows.</CardDescription>
          </CardHeader>
          <CardContent>
            <QcDefectGallery limit={20} title="" />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
