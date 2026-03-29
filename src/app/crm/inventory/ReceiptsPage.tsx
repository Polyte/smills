import { useCallback, useEffect, useState } from "react";
import { isCrmDataAvailable } from "../../../lib/crm/crmRepo";
import type { CrmActor } from "../../../lib/crm/crmRepo";
import { invListItems, invListLocations, invPostReceipt } from "../../../lib/crm/inventoryRepo";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database, InvReceiptSource } from "../database.types";
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

export function ReceiptsPage() {
  const { user, profile } = useCrmAuth();
  const [items, setItems] = useState<ItemRow[]>([]);
  const [locs, setLocs] = useState<LocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [qty, setQty] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [source, setSource] = useState<InvReceiptSource>("local_purchase");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const actor: CrmActor | null =
    user && profile ? { id: user.id, role: profile.role } : null;

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
      setLocationId((cur) => (cur || lc[0]?.id) ?? "");
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
    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0) {
      toast.error("Enter a positive quantity.");
      return;
    }
    if (!itemId || !locationId) {
      toast.error("Choose item and location.");
      return;
    }
    setSubmitting(true);
    try {
      const uc = unitCost.trim() === "" ? null : Number(unitCost);
      const { error } = await invPostReceipt(actor, {
        item_id: itemId,
        location_id: locationId,
        qty: q,
        unit_cost: uc != null && Number.isFinite(uc) ? uc : null,
        source,
        notes: notes.trim() || undefined,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Receipt posted");
      setQty("1");
      setUnitCost("");
      setNotes("");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-muted-foreground">
        Staff can post receipts; import vs local is recorded on the movement for traceability.
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
            <Label>Receive into location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
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
            <Label htmlFor="rc-qty">Quantity</Label>
            <Input
              id="rc-qty"
              type="number"
              step="any"
              min={0.0001}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Source</Label>
            <Select
              value={source}
              onValueChange={(v) => setSource(v as InvReceiptSource)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local_purchase">Local purchase</SelectItem>
                <SelectItem value="import">Import</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rc-cost">Unit cost (optional)</Label>
            <Input
              id="rc-cost"
              type="number"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="ZAR per UOM"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rc-notes">Notes</Label>
            <Textarea
              id="rc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <Button type="submit" disabled={submitting || !actor}>
            Post receipt
          </Button>
        </form>
      )}
    </div>
  );
}
