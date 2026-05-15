import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Table2 } from "lucide-react";
import { useCrmAuth } from "../CrmAuthContext";
import {
  createSalesOrder,
  listSalesOrders,
  type SalesOrderRow,
} from "../../../lib/crm/factoryRepo";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { toast } from "sonner";
import {
  CrmTableScroll,
  CrmTableSkeleton,
  crmFactoryIconWrapClass,
  crmFactoryLinkClass,
  crmFactoryPrimaryButtonClass,
} from "../components/crmDataUi";

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
    <div className="space-y-6" data-gsap-section>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={crmFactoryIconWrapClass}>
            <Table2 className="size-5 text-[var(--crm-factory-accent)]" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-normal tracking-tight text-foreground">Sales orders</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Factory textile workflow. Spreadsheet import lines live on a dedicated page.
            </p>
          </div>
        </div>
        <button type="button" className={crmFactoryPrimaryButtonClass} onClick={() => void onCreate()}>
          New factory order
        </button>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="space-y-1 border-b border-border/40 bg-muted/15 pb-4">
          <CardTitle className="text-base font-semibold text-foreground">Spreadsheet sales ledger</CardTitle>
          <CardDescription>
            Filters, supervisor charts, Supabase sync, and Excel/PDF exports — open the full page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Manage imported lines and exports from the ledger workspace.</p>
          <Link to="/crm/sales-ledger" className={crmFactoryPrimaryButtonClass}>
            Open sales ledger
          </Link>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/40 bg-muted/15 pb-3">
          <CardTitle className="text-base font-semibold text-foreground">Factory orders</CardTitle>
          <CardDescription>Open an order to change status and view live machine context.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 sm:p-5">
              <CrmTableScroll>
                <CrmTableSkeleton columnCount={4} rowCount={6} />
              </CrmTableScroll>
            </div>
          ) : (
            <CrmTableScroll className="sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 bg-muted/30 hover:bg-muted/30">
                    {["Order", "Status", "Fabric", ""].map((h) => (
                      <TableHead
                        key={h}
                        className={
                          h === ""
                            ? "text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                            : "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                        }
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} className="border-border/50 transition-colors hover:bg-muted/25">
                      <TableCell className="font-mono text-sm text-foreground">{r.order_number}</TableCell>
                      <TableCell className="text-sm capitalize text-muted-foreground">
                        {r.status.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.fabric_type ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Link to={`/crm/orders/${r.id}`} className={`text-sm ${crmFactoryLinkClass}`}>
                          View →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CrmTableScroll>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

