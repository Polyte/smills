import { useCallback, useEffect, useState } from "react";
import { isCrmDataAvailable } from "../../../lib/crm/crmRepo";
import type { CrmActor } from "../../../lib/crm/crmRepo";
import { invListItems, invListLocations, invPostTransfer } from "../../../lib/crm/inventoryRepo";
import { isOpsAdmin } from "../../../lib/crm/roles";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database } from "../database.types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from "sonner";

type ItemRow = Database["public"]["Tables"]["inv_items"]["Row"];
type LocRow = Database["public"]["Tables"]["inv_locations"]["Row"];

export function TransfersPage() {
  const { user, profile } = useCrmAuth();
  const [items, setItems] = useState<ItemRow[]>([]);
  const [locs, setLocs] = useState<LocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemId, setItemId] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [qty, setQty] = useState("1");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const actor: CrmActor | null =
    user && profile ? { id: user.id, role: profile.role } : null;
  const canTransfer = isOpsAdmin(profile?.role);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [it, lc] = await Promise.all([invListItems(true), invListLocations()]);
      setItems(it);
      setLocs(lc);
      setItemId((cur) => (cur || it[0]?.id) ?? "");
      setFromId((cur) => (cur || lc[0]?.id) ?? "");
      setToId((cur) => {
        if (cur) return cur;
        if (lc[1]?.id) return lc[1].id;
        return lc[0]?.id ?? "";
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!actor) return;
    if (!canTransfer) {
      toast.error("Only operations managers can post transfers.");
      return;
    }
    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0) {
      toast.error("Enter a positive quantity.");
      return;
    }
    if (!itemId || !fromId || !toId) {
      toast.error("Choose item and both locations.");
      return;
    }
    if (fromId === toId) {
      toast.error("From and to must differ.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await invPostTransfer(actor, {
        item_id: itemId,
        from_location_id: fromId,
        to_location_id: toId,
        qty: q,
        notes: notes.trim() || undefined,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Transfer posted");
      setQty("1");
      setNotes("");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  if (!canTransfer) {
    return (
      <p className="text-sm text-muted-foreground">
        Your role cannot post transfers. Ask an operations manager.
      </p>
    );
  }

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-muted-foreground">
        Moves stock between locations (transfer out + transfer in). Source balance must cover the quantity.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 rounded-lg border border-border p-4">
          <div className="grid gap-2">
            <Label>Item</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.sku} — {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>From location</Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locs.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} ({l.zone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>To location</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locs.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} ({l.zone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tr-qty">Quantity</Label>
            <Input
              id="tr-qty"
              type="number"
              step="any"
              min={0.0001}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tr-notes">Notes</Label>
            <Textarea
              id="tr-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <Button type="submit" disabled={submitting || !actor}>
            Post transfer
          </Button>
        </form>
      )}
    </div>
  );
}
