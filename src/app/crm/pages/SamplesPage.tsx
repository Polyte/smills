import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { crmUsesSupabase } from "../../../lib/crm/crmRepo";
import {
  createSampleRequest,
  listSalesOrders,
  listSampleRequests,
  updateSampleRequest,
  type SampleRequestRow,
  type SampleRequestStatus,
} from "../../../lib/crm/factoryRepo";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { useCrmAuth } from "../CrmAuthContext";

type Row = SampleRequestRow & { sales_orders?: { order_number: string } | null };

export function SamplesPage() {
  const { user } = useCrmAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof listSalesOrders>>>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const [newOrderId, setNewOrderId] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const [editStatus, setEditStatus] = useState<SampleRequestStatus>("requested");
  const [editNotes, setEditNotes] = useState("");
  const [editReject, setEditReject] = useState("");

  const load = useCallback(async () => {
    if (!crmUsesSupabase()) return;
    try {
      const [s, o] = await Promise.all([listSampleRequests(), listSalesOrders()]);
      setRows(s);
      setOrders(o);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openEdit(r: Row) {
    setEditing(r);
    setEditStatus(r.status);
    setEditNotes(r.tracking_notes ?? "");
    setEditReject(r.rejected_reason ?? "");
    setEditOpen(true);
  }

  if (!crmUsesSupabase()) {
    return <p className="text-sm text-muted-foreground">Samples require Supabase.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-display font-bold tracking-tight">Sample requests</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!user || orders.length === 0}
            onClick={() => {
              const pending = orders.find((x) => x.status === "sample_pending");
              setNewOrderId(pending?.id ?? orders[0]?.id ?? "");
              setNewNotes("");
              setCreateOpen(true);
            }}
          >
            <Plus className="size-4 mr-1" />
            New request
          </Button>
          <Link to="/crm/orders" className="text-sm font-medium text-primary hover:underline self-center">
            Sales orders
          </Link>
        </div>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lab tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">
                    <Link to={`/crm/orders/${r.sales_order_id}`} className="text-primary hover:underline">
                      {r.sales_orders?.order_number ?? r.sales_order_id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">{r.status.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {r.tracking_notes ?? r.rejected_reason ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(r)}>
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New sample request</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Sales order</p>
              <Select value={newOrderId} onValueChange={setNewOrderId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.order_number} · {o.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Tracking / lab notes (optional)"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!user || !newOrderId}
              onClick={() =>
                user &&
                void createSampleRequest({
                  sales_order_id: newOrderId,
                  tracking_notes: newNotes.trim() || null,
                  created_by: user.id,
                })
                  .then(() => {
                    toast.success("Sample requested");
                    setCreateOpen(false);
                    setNewNotes("");
                    void load();
                  })
                  .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
              }
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update sample</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="grid gap-3 py-2">
              <p className="text-sm text-muted-foreground">
                Order{" "}
                <span className="font-mono text-foreground">
                  {editing.sales_orders?.order_number ?? editing.sales_order_id.slice(0, 8)}
                </span>
              </p>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as SampleRequestStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="in_lab">In lab</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Tracking notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
              />
              {editStatus === "rejected" ? (
                <Input
                  placeholder="Rejection reason"
                  value={editReject}
                  onChange={(e) => setEditReject(e.target.value)}
                />
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!editing}
              onClick={() =>
                editing &&
                void updateSampleRequest(editing.id, {
                  status: editStatus,
                  tracking_notes: editNotes.trim() || null,
                  rejected_reason: editStatus === "rejected" ? editReject.trim() || null : null,
                })
                  .then(() => {
                    toast.success("Updated");
                    setEditOpen(false);
                    void load();
                  })
                  .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
