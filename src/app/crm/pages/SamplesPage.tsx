import { useCallback, useEffect, useRef, useState } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import {
  CrmTableScroll,
  CrmTableSkeleton,
  crmFactoryLinkClass,
  crmFactoryPrimaryButtonClass,
} from "../components/crmDataUi";
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
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { FlaskConical, Pencil, Plus } from "lucide-react";
import { cn } from "../../components/ui/utils";
import { useCrmAuth } from "../CrmAuthContext";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSmoothScroll } from "../hooks/useSmoothScroll";

gsap.registerPlugin(ScrollTrigger);

type Row = SampleRequestRow & { sales_orders?: { order_number: string } | null };

/* DESIGN.md timeline pastels mapped to sample lifecycle stages */
const STATUS_CONFIG: Record<
  SampleRequestStatus,
  { label: string; bg: string; border: string; dot: string; textColor: string }
> = {
  requested: {
    label: "Requested",
    bg: "rgba(223,168,143,0.18)",
    border: "rgba(223,168,143,0.40)",
    dot: "#dfa88f",
    textColor: "var(--foreground)",
  },
  in_lab: {
    label: "In lab",
    bg: "rgba(159,187,224,0.18)",
    border: "rgba(159,187,224,0.40)",
    dot: "#9fbbe0",
    textColor: "var(--foreground)",
  },
  approved: {
    label: "Approved",
    bg: "rgba(192,133,50,0.14)",
    border: "rgba(192,133,50,0.32)",
    dot: "#c08532",
    textColor: "var(--foreground)",
  },
  rejected: {
    label: "Rejected",
    bg: "rgba(207,45,86,0.08)",
    border: "rgba(207,45,86,0.20)",
    dot: "#cf2d56",
    textColor: "var(--destructive)",
  },
};

function StatusPill({ status }: { status: SampleRequestStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.requested;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.textColor,
        letterSpacing: "0.88px",
      }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

export function SamplesPage() {
  const { user } = useCrmAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof listSalesOrders>>>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const [newOrderId, setNewOrderId] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [editStatus, setEditStatus] = useState<SampleRequestStatus>("requested");
  const [editNotes, setEditNotes] = useState("");
  const [editReject, setEditReject] = useState("");

  const pageRef = useRef<HTMLDivElement>(null);
  useSmoothScroll();

  const load = useCallback(async () => {
    if (!crmUsesSupabase()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [s, o] = await Promise.all([listSampleRequests(), listSalesOrders()]);
      setRows(s);
      setOrders(o);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!pageRef.current || loading) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      gsap.set(".smp-header, .smp-stat, .smp-row", { autoAlpha: 1 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(".smp-header",
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }
      );
      gsap.fromTo(".smp-stat",
        { autoAlpha: 0, y: 18, scale: 0.96 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.4)", stagger: 0.09, delay: 0.15 }
      );
      gsap.utils.toArray<HTMLElement>(".smp-row").forEach((el, i) => {
        gsap.fromTo(el,
          { autoAlpha: 0, x: 14 },
          {
            autoAlpha: 1, x: 0, duration: 0.35, delay: 0.3 + i * 0.04, ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 95%", toggleActions: "play none none reverse" },
          }
        );
      });
    }, pageRef);
    return () => ctx.revert();
  }, [rows, loading]);

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

  const stats = {
    requested: rows.filter((r) => r.status === "requested").length,
    in_lab: rows.filter((r) => r.status === "in_lab").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  };

  return (
    <div ref={pageRef} className="space-y-6">
      {/* Header */}
      <div className="smp-header flex flex-col gap-4 opacity-0 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 shadow-[0_0_0_1px_oklch(0.55_0.12_230/0.35)]">
            <FlaskConical className="size-5 text-sky-600 dark:text-sky-400" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-normal tracking-tight text-foreground">Sample requests</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Lab tracking for sample orders.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            disabled={!user || orders.length === 0}
            onClick={() => {
              const pending = orders.find((x) => x.status === "sample_pending");
              setNewOrderId(pending?.id ?? orders[0]?.id ?? "");
              setNewNotes("");
              setCreateOpen(true);
            }}
            className={cn(
              crmFactoryPrimaryButtonClass,
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <Plus className="size-4" />
            New request
          </button>
          <Link to="/crm/orders" className={cn("text-sm", crmFactoryLinkClass)}>
            Sales orders →
          </Link>
        </div>
      </div>

      {/* Status summary — DESIGN.md timeline pastels */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["requested", "in_lab", "approved", "rejected"] as SampleRequestStatus[]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <div
                key={s}
                className="smp-stat opacity-0 rounded-xl p-4"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
              >
                <div className="mb-2 flex items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: cfg.dot }}
                  />
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {cfg.label}
                  </p>
                </div>
                <p
                  className="font-display font-normal tabular-nums"
                  style={{
                    color: cfg.textColor,
                    fontSize: "28px",
                    letterSpacing: "-0.5px",
                    lineHeight: 1.15,
                  }}
                >
                  {stats[s]}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/40 bg-muted/15 pb-3">
          <CardTitle className="text-base text-foreground">Lab tracking</CardTitle>
          <CardDescription>
            {loading ? "Loading…" : `${rows.length} sample request${rows.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 sm:p-5">
              <CrmTableScroll>
                <CrmTableSkeleton columnCount={4} rowCount={6} />
              </CrmTableScroll>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-muted-foreground">
              <FlaskConical className="size-9 opacity-25" />
              <p className="text-sm">No sample requests yet.</p>
              {user && orders.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-10 gap-1.5"
                  onClick={() => {
                    setNewOrderId(orders[0]?.id ?? "");
                    setNewNotes("");
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="size-4" /> Create first request
                </Button>
              )}
            </div>
          ) : (
            <CrmTableScroll className="sm:px-0">
              <Table>
            <TableHeader>
              <TableRow className="border-border/60 bg-muted/30 hover:bg-muted/30">
                {["Order", "Status", "Notes / reason", ""].map((h) => (
                  <TableHead
                    key={h}
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                      h === "" && "w-12",
                    )}
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow
                  key={r.id}
                  className="smp-row border-border/50 opacity-0 transition-colors duration-150 hover:bg-muted/25"
                >
                  <TableCell className="font-mono text-sm">
                    <Link to={`/crm/orders/${r.sales_order_id}`} className={cn("text-sm", crmFactoryLinkClass, "hover:underline")}>
                      {r.sales_orders?.order_number ?? r.sales_order_id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusPill status={r.status} />
                  </TableCell>
                  <TableCell className="max-w-[20rem] truncate text-sm text-muted-foreground">
                    {r.tracking_notes ?? r.rejected_reason ?? "—"}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      aria-label="Edit"
                      onClick={() => openEdit(r)}
                      className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            </CrmTableScroll>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New sample request</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Sales order</Label>
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
            <div className="space-y-1.5">
              <Label>Tracking / lab notes (optional)</Label>
              <Textarea
                placeholder="Notes…"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <button
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
              className={cn(crmFactoryPrimaryButtonClass, "disabled:opacity-50")}
            >
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update sample</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 py-2">
              <p className="text-sm text-muted-foreground">
                Order{" "}
                <span className="font-mono text-foreground">
                  {editing.sales_orders?.order_number ?? editing.sales_order_id.slice(0, 8)}
                </span>
              </p>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={editStatus}
                  onValueChange={(v) => setEditStatus(v as SampleRequestStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["requested", "in_lab", "approved", "rejected"] as SampleRequestStatus[]).map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_CONFIG[s].label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tracking notes</Label>
                <Textarea
                  placeholder="Lab notes…"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                />
              </div>
              {editStatus === "rejected" && (
                <div className="space-y-1.5">
                  <Label>Rejection reason</Label>
                  <Input
                    placeholder="Why rejected…"
                    value={editReject}
                    onChange={(e) => setEditReject(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <button
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
              className={cn(crmFactoryPrimaryButtonClass, "disabled:opacity-50")}
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
