import { useCallback, useEffect, useState } from "react";
import { useCrmAuth } from "../CrmAuthContext";
import {
  deleteAutomationRule,
  listAutomationRules,
  upsertAutomationRule,
  type AutomationRuleRow,
} from "../../../lib/crm/factoryRepo";
import { canManageAutomationRules } from "../../../lib/crm/roles";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";

export function AutomationRulesPage() {
  const { user, profile } = useCrmAuth();
  const [rules, setRules] = useState<AutomationRuleRow[]>([]);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<AutomationRuleRow["trigger_type"]>("manual");
  const [conditionJson, setConditionJson] = useState("{}");
  const [actionJson, setActionJson] = useState("{}");

  const load = useCallback(async () => {
    try {
      setRules(await listAutomationRules());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canManageAutomationRules(profile?.role)) {
    return <p className="text-sm text-muted-foreground">You need production manager or admin access to edit rules.</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Automation rules</h1>
        <p className="text-sm text-muted-foreground">
          Declarative triggers stored in Supabase. Critical workflows also fire from database triggers (QC fail,
          quality passed).
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">New rule</CardTitle>
          <CardDescription>Use valid JSON for condition and action payloads.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Trigger</Label>
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v as AutomationRuleRow["trigger_type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qc_fail">qc_fail</SelectItem>
                <SelectItem value="stock_above">stock_above</SelectItem>
                <SelectItem value="order_status">order_status</SelectItem>
                <SelectItem value="machine_downtime">machine_downtime</SelectItem>
                <SelectItem value="manual">manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Condition JSON</Label>
            <Textarea value={conditionJson} onChange={(e) => setConditionJson(e.target.value)} rows={3} className="font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <Label>Action JSON</Label>
            <Textarea value={actionJson} onChange={(e) => setActionJson(e.target.value)} rows={3} className="font-mono text-xs" />
          </div>
          <Button
            type="button"
            disabled={!user || !name.trim()}
            onClick={() => {
              if (!user) return;
              let cond: Record<string, unknown> = {};
              let act: Record<string, unknown> = {};
              try {
                cond = JSON.parse(conditionJson || "{}") as Record<string, unknown>;
                act = JSON.parse(actionJson || "{}") as Record<string, unknown>;
              } catch {
                toast.error("Invalid JSON");
                return;
              }
              void upsertAutomationRule({
                name: name.trim(),
                trigger_type: triggerType,
                condition_json: cond,
                action_json: act,
                created_by: user.id,
              })
                .then(() => {
                  toast.success("Rule saved");
                  setName("");
                  void load();
                })
                .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
            }}
          >
            Save rule
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Existing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="flex flex-wrap justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.trigger_type} · {r.enabled ? "on" : "off"}</p>
              </div>
              {profile?.role === "admin" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() =>
                    void deleteAutomationRule(r.id)
                      .then(() => {
                        toast.success("Deleted");
                        void load();
                      })
                      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
                  }
                >
                  Delete
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
