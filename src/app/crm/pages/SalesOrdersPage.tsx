import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useCrmAuth } from "../CrmAuthContext";
import { crmUsesSupabase } from "../../../lib/crm/crmRepo";
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
    if (!crmUsesSupabase()) {
      setRows([]);
      setLoading(false);
      return;
    }
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

  if (!crmUsesSupabase()) {
    return (
      <p className="text-sm text-muted-foreground">
        Sales orders require Supabase. Factory modules are not available in local SQLite CRM mode.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Sales orders</h1>
          <p className="text-sm text-muted-foreground">Textile workflow from quotation to delivery.</p>
        </div>
        <Button type="button" onClick={() => void onCreate()}>
          New order
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All orders</CardTitle>
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
                      <Link to={`/crm/orders/${r.id}`} className="text-primary text-sm font-medium hover:underline">
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
