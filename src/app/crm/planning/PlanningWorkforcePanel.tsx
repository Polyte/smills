import { useCallback, useEffect, useState } from "react";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { isCrmDataAvailable } from "../../../lib/crm/mode";
import { parseYearMonth } from "../../../lib/crm/sppWeekUtils";
import {
  departmentMinutesInRange,
  fetchSegmentsJoined,
  formatMinutes,
  canViewWorkforceSelf,
} from "../../../lib/crm/workforceRepo";
import type { UserRole } from "../database.types";

type Props = {
  yearMonth: string;
  role: UserRole | undefined;
};

export function PlanningWorkforcePanel({ yearMonth, role }: Props) {
  const [loading, setLoading] = useState(false);
  const [curRows, setCurRows] = useState<{ name: string; minutes: number }[]>([]);
  const [prevRows, setPrevRows] = useState<{ name: string; minutes: number }[]>([]);

  const canView = canViewWorkforceSelf(role);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !canView) return;
    setLoading(true);
    try {
      const curStart = startOfMonth(parseYearMonth(yearMonth));
      const curEnd = endOfMonth(curStart);
      const prevStart = startOfMonth(subMonths(curStart, 1));
      const prevEnd = endOfMonth(prevStart);
      const fromCur = curStart.toISOString();
      const toCur = curEnd.toISOString();
      const fromPrev = prevStart.toISOString();
      const toPrev = prevEnd.toISOString();
      const [segCur, segPrev] = await Promise.all([
        fetchSegmentsJoined({ from: fromCur, to: toCur }),
        fetchSegmentsJoined({ from: fromPrev, to: toPrev }),
      ]);
      const mapCur = departmentMinutesInRange(segCur, fromCur, toCur);
      const mapPrev = departmentMinutesInRange(segPrev, fromPrev, toPrev);
      setCurRows(
        [...mapCur.entries()]
          .map(([, v]) => ({ name: v.name, minutes: v.minutes }))
          .sort((a, b) => b.minutes - a.minutes)
      );
      setPrevRows(
        [...mapPrev.entries()]
          .map(([, v]) => ({ name: v.name, minutes: v.minutes }))
          .sort((a, b) => b.minutes - a.minutes)
      );
    } finally {
      setLoading(false);
    }
  }, [yearMonth, canView]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canView) return null;

  const names = new Set([...curRows.map((r) => r.name), ...prevRows.map((r) => r.name)]);
  const merged = [...names].map((name) => {
    const c = curRows.find((r) => r.name === name)?.minutes ?? 0;
    const p = prevRows.find((r) => r.name === name)?.minutes ?? 0;
    const delta = p > 0 ? ((c - p) / p) * 100 : c > 0 ? 100 : 0;
    return { name, current: c, previous: p, deltaPct: delta };
  });
  merged.sort((a, b) => b.current - a.current);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Labour time by department (context)</CardTitle>
        <CardDescription>
          Department minutes from RFID segments in the selected month vs prior month (WoW/MoM-style comparison).
          Correlation with production variance is interpretive —{" "}
          <Link to="/crm/workforce/reports" className="text-primary underline-offset-2 hover:underline">
            open Workforce reports
          </Link>{" "}
          for detail.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading workforce data…</p>
        ) : merged.length === 0 ? (
          <p className="text-sm text-muted-foreground">No department segments in this period yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">This month</TableHead>
                <TableHead className="text-right">Prior month</TableHead>
                <TableHead className="text-right">Δ %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merged.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatMinutes(r.current)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatMinutes(r.previous)}</TableCell>
                  <TableCell
                    className={`text-right font-mono text-sm ${
                      r.deltaPct < 0 ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {r.previous === 0 && r.current === 0 ? "—" : `${r.deltaPct >= 0 ? "+" : ""}${r.deltaPct.toFixed(0)}%`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
