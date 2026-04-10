import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Table2 } from "lucide-react";
import { useCrmAuth } from "../CrmAuthContext";
import {
  createSalesOrder,
  listSalesOrders,
  type SalesOrderRow,
} from "../../../lib/crm/factoryRepo";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { toast } from "sonner";

export function SalesOrdersPage() {
  const { user } = useCrmAuth();
  const [rows, setRows] = useState<SalesOrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listSalesOrders());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate() {
    if (!user) return;
    try {
      await createSalesOrder({ owner_id: user.id, fabric_type: "Greige", notes: "New order" });
      toast.success("Order created");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Sales orders</h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Factory textile workflow. Spreadsheet import lines live on a dedicated page.
          </p>
        </div>
        <Button
          type="button"
          className="min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={() => void onCreate()}
        >
          New factory order
        </Button>
      </div>

      <Card className="overflow-hidden rounded-2xl border-primary/15 bg-gradient-to-br from-primary/8 via-card to-card shadow-md transition-shadow duration-200 hover:shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Table2 className="size-5 text-primary" />
                Spreadsheet sales ledger
              </CardTitle>
              <CardDescription>
                Filters, supervisor charts, Supabase sync, and Excel/PDF exports — open the full page.
              </CardDescription>
            </div>
            <Button
              asChild
              className="min-h-[44px] shrink-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Link to="/crm/sales-ledger">Open sales ledger</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card className="rounded-2xl border-border/70 shadow-sm transition-shadow duration-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Factory orders</CardTitle>
          <CardDescription>Open an order to change status and view live machine context.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fabric</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.order_number}</TableCell>
                    <TableCell className="capitalize">{r.status.replace(/_/g, " ")}</TableCell>
                    <TableCell>{r.fabric_type ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/crm/orders/${r.id}`}
                        className="text-primary text-sm font-medium transition-all duration-200 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
