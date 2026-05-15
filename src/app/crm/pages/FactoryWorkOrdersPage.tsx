import { useCallback, useEffect, useState } from "react";
import { Wrench } from "lucide-react";
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
    <div className="space-y-6" data-gsap-section>
      <div className="relative isolate overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 px-6 py-5 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-[oklch(0.45_0.14_265)] via-[#D4AF37] via-60% to-[oklch(0.45_0.14_265)]" />
        <div className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-[radial-gradient(circle,#D4AF37/0.06),transparent_65%)] blur-2xl" />
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-amber-200/70 bg-amber-50 shadow-sm">
            <Wrench className="size-5 text-amber-600" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Factory work orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Shop-floor work (planned → in progress → completed / held). Optionally link to a sales order.
            </p>
          </div>
        </div>
      </div>

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


