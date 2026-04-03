import { useCallback, useEffect, useState } from "react";
import { useCrmAuth } from "../CrmAuthContext";
import { crmUsesSupabase } from "../../../lib/crm/crmRepo";
import { createFactoryWorkOrderRow, listFactoryWorkOrders, type FactoryWorkOrderRow } from "../../../lib/crm/factoryRepo";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";

export function FactoryWorkOrdersPage() {
  const { user } = useCrmAuth();
  const [rows, setRows] = useState<FactoryWorkOrderRow[]>([]);
  const [code, setCode] = useState("");
  const [line, setLine] = useState("");

  const load = useCallback(async () => {
    if (!crmUsesSupabase()) return;
    try {
      setRows(await listFactoryWorkOrders());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!crmUsesSupabase()) {
    return (
      <p className="text-sm text-muted-foreground">
        Factory work orders require Supabase. These are separate from inventory production orders (stock issues).
      </p>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-display font-bold tracking-tight">Factory work orders</h1>
      <p className="text-sm text-muted-foreground">
        Shop-floor work (planned → in progress → completed / held). Optionally link to a sales order in the database.
      </p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">New work order</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input placeholder="Code e.g. WO-2401" value={code} onChange={(e) => setCode(e.target.value)} className="w-48" />
          <Input placeholder="Machine line" value={line} onChange={(e) => setLine(e.target.value)} className="w-48" />
          <Button
            type="button"
            disabled={!user || !code.trim()}
            onClick={() =>
              user &&
              void createFactoryWorkOrderRow({
                code: code.trim(),
                machine_line: line.trim() || null,
                created_by: user.id,
              })
                .then(() => {
                  toast.success("Created");
                  setCode("");
                  void load();
                })
                .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
            }
          >
            Create
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Open & recent</CardTitle>
          <CardDescription>Status drives shop scheduling; link to inventory PO only when posting stock.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border">
            {rows.map((r) => (
              <li key={r.id} className="px-3 py-2 text-sm flex justify-between gap-2">
                <span className="font-mono font-medium">{r.code}</span>
                <span className="text-muted-foreground capitalize">{r.status.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
