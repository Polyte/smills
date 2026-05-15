import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
import {
  deleteDeal,
  isCrmDataAvailable,
  listContacts,
  listDeals,
  saveDeal as persistDeal,
} from "../../../lib/crm/crmRepo";
import { canWriteCommercial, isOpsAdmin } from "../../../lib/crm/roles";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database, DealStage } from "../database.types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { Briefcase, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "../../components/ui/utils";

type DealRow = Database["public"]["Tables"]["deals"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];

type DealWithContact = DealRow & {
  contacts: Pick<ContactRow, "company_name"> | null;
};

const STAGE_CONFIG: Record<DealStage, { label: string; className: string }> = {
  qualification: { label: "Qualification", className: "bg-amber-100 text-amber-800 border-amber-200" },
  proposal: { label: "Proposal", className: "bg-blue-100 text-blue-800 border-blue-200" },
  won: { label: "Won", className: "bg-green-100 text-green-800 border-green-200" },
  lost: { label: "Lost", className: "bg-red-100 text-red-700 border-red-200" },
};

function stageBadge(stage: DealStage) {
  const cfg = STAGE_CONFIG[stage] ?? { label: stage, className: "" };
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

function zarFormat(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "ZAR", maximumFractionDigits: 0 });
}

export function DealsPage() {
  const { user, profile } = useCrmAuth();
  const [rows, setRows] = useState<DealWithContact[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealRow | null>(null);
  const [form, setForm] = useState({
    contact_id: "",
    title: "",
    stage: "qualification" as DealStage,
    value_zar: "",
    expected_close: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<DealRow | null>(null);

  const canWrite = canWriteCommercial(profile?.role);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listDeals();
      setRows(data as DealWithContact[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load deals");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadContacts = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) return;
    try {
      const data = await listContacts();
      setContacts(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load contacts");
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadContacts(); }, [loadContacts]);

  useEffect(() => {
    if (loading || !pageRef.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".gsap-page-header",
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.75, ease: "power3.out" }
      );

      gsap.fromTo(
        ".gsap-stat-card",
        { autoAlpha: 0, y: 20, scale: 0.94 },
        {
          autoAlpha: 1, y: 0, scale: 1,
          duration: 0.55, stagger: 0.1,
          ease: "back.out(1.4)", delay: 0.18,
        }
      );

      gsap.fromTo(
        ".gsap-stage-filter",
        { autoAlpha: 0, x: -16 },
        { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.06, ease: "power2.out", delay: 0.35 }
      );

      gsap.utils.toArray<HTMLElement>(".gsap-table-row").forEach((el, i) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, x: -14 },
          {
            autoAlpha: 1, x: 0,
            duration: 0.38, delay: 0.45 + i * 0.035,
            ease: "power2.out",
          }
        );
      });
    }, pageRef);

    return () => ctx.revert();
  }, [loading]);

  function openCreate() {
    setEditing(null);
    setForm({
      contact_id: contacts[0]?.id ?? "",
      title: "",
      stage: "qualification",
      value_zar: "",
      expected_close: "",
    });
    setDialogOpen(true);
  }

  function openEdit(row: DealRow) {
    setEditing(row);
    setForm({
      contact_id: row.contact_id,
      title: row.title,
      stage: row.stage,
      value_zar: row.value_zar != null ? String(row.value_zar) : "",
      expected_close: row.expected_close ?? "",
    });
    setDialogOpen(true);
  }

  async function submitDealForm() {
    if (!isCrmDataAvailable() || !user || !profile) return;
    const valueNum = form.value_zar.trim() ? Number(form.value_zar) : null;
    const payload = {
      id: editing?.id,
      contact_id: form.contact_id,
      title: form.title.trim(),
      stage: form.stage,
      value_zar: valueNum !== null && !Number.isNaN(valueNum) ? valueNum : null,
      expected_close: form.expected_close.trim() || null,
      owner_id: editing ? editing.owner_id : user.id,
    };
    const { error } = await persistDeal(payload, { id: user.id, role: profile.role });
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Deal updated" : "Deal created");
    setDialogOpen(false);
    void load();
  }

  async function confirmDelete() {
    if (!deleteTarget || !user || !profile) return;
    const { error } = await deleteDeal(deleteTarget.id, { id: user.id, role: profile.role });
    if (error) { toast.error(error.message); return; }
    toast.success("Deal removed");
    setDeleteTarget(null);
    void load();
  }

  function canDelete(row: DealRow) {
    if (isOpsAdmin(profile?.role)) return true;
    if ((profile?.role === "quality_officer" || profile?.role === "sales") && row.owner_id === user?.id) return true;
    return false;
  }

  const filteredRows = stageFilter === "all" ? rows : rows.filter((r) => r.stage === stageFilter);

  const stats = useMemo(() => {
    const open = rows.filter((r) => r.stage !== "won" && r.stage !== "lost");
    const pipelineValue = open.reduce((s, r) => s + (r.value_zar ?? 0), 0);
    const wonValue = rows.filter((r) => r.stage === "won").reduce((s, r) => s + (r.value_zar ?? 0), 0);
    return { open: open.length, pipelineValue, wonValue };
  }, [rows]);

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  const STAGES = ["all", "qualification", "proposal", "won", "lost"] as const;

  return (
    <div ref={pageRef} className="space-y-6">
      {/* Header */}
      <div className="gsap-page-header relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/30 p-5 shadow-sm lg:p-6">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[oklch(0.45_0.14_265)] via-[oklch(0.72_0.14_82)] to-[oklch(0.55_0.15_300)]" />
        <div className="pointer-events-none absolute right-0 top-0 size-48 rounded-full bg-[radial-gradient(circle_at_70%_30%,oklch(0.72_0.14_82/0.08),transparent_65%)] blur-2xl" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/15">
                <Briefcase className="size-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">CRM / Deals</span>
            </div>
            <h2 className="text-2xl font-display font-bold tracking-tight lg:text-3xl">Deals</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pipeline linked to contacts. Track from qualification to close.</p>
          </div>
          {canWrite && (
            <Button type="button" onClick={openCreate} disabled={contacts.length === 0} className="shrink-0 gap-1.5 shadow-sm">
              <Plus className="size-4" />
              Add deal
            </Button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="gsap-stat-card crm-card-hover overflow-hidden rounded-2xl border-border/70 bg-gradient-to-br from-card to-muted/20 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Open pipeline</p>
              <p className="text-2xl font-display font-bold tabular-nums mt-1.5">{stats.open}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">{zarFormat(stats.pipelineValue)}</p>
            </CardContent>
          </Card>
          <Card className="gsap-stat-card crm-card-hover overflow-hidden rounded-2xl border-emerald-200/60 bg-gradient-to-br from-emerald-50/50 to-emerald-50/20 dark:from-emerald-900/20 dark:to-emerald-950/10 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Won value</p>
              <p className="text-2xl font-display font-bold tabular-nums mt-1.5 text-emerald-700 dark:text-emerald-400">{zarFormat(stats.wonValue)}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">{rows.filter((r) => r.stage === "won").length} deals</p>
            </CardContent>
          </Card>
          <Card className="gsap-stat-card crm-card-hover overflow-hidden rounded-2xl border-border/70 bg-gradient-to-br from-card to-muted/20 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total deals</p>
              <p className="text-2xl font-display font-bold tabular-nums mt-1.5">{rows.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">all time</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stage filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Stage:</span>
        {STAGES.map((s) => (
          <Button
            key={s}
            type="button"
            variant={stageFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStageFilter(s)}
            className={cn(
              "gsap-stage-filter capitalize rounded-lg transition-all duration-200",
              stageFilter === s && "shadow-sm"
            )}
          >
            {s === "all" ? "All" : STAGE_CONFIG[s as DealStage]?.label ?? s}
            {s !== "all" && (
              <span className="ml-1.5 text-[10px] opacity-70 tabular-nums">
                {rows.filter((r) => r.stage === s).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="pb-2 border-b border-border/40 bg-muted/20">
          <CardTitle className="text-base font-display">
            {stageFilter === "all" ? "All deals" : `${STAGE_CONFIG[stageFilter as DealStage]?.label ?? stageFilter} deals`}
          </CardTitle>
          <CardDescription>
            {loading ? "Loading…" : `${filteredRows.length} deal${filteredRows.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading deals…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Title</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Expected close</TableHead>
                    {canWrite && <TableHead className="text-right w-[88px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canWrite ? 6 : 5} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Briefcase className="size-8 opacity-30" />
                          <p className="text-sm">No deals in this view.</p>
                          {canWrite && stageFilter === "all" && (
                            <Button type="button" size="sm" variant="outline" onClick={openCreate} disabled={contacts.length === 0}>
                              <Plus className="size-4" /> Add first deal
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row, i) => (
                      <TableRow key={row.id} className={cn("gsap-table-row transition-colors hover:bg-muted/40", i % 2 !== 0 ? "bg-muted/20" : "")}>
                        <TableCell className="font-medium">{row.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.contacts?.company_name ?? "—"}</TableCell>
                        <TableCell>{stageBadge(row.stage)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{zarFormat(row.value_zar)}</TableCell>
                        <TableCell className="text-sm">{row.expected_close ?? "—"}</TableCell>
                        {canWrite && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button type="button" variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(row)}>
                                <Pencil className="size-4" />
                              </Button>
                              {canDelete(row) && (
                                <Button type="button" variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleteTarget(row)}>
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit deal" : "New deal"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Contact</Label>
              <Select value={form.contact_id} onValueChange={(v) => setForm((f) => ({ ...f, contact_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-title">Title</Label>
              <Input
                id="deal-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v as DealStage }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["qualification", "proposal", "won", "lost"] as DealStage[]).map((s) => (
                    <SelectItem key={s} value={s}>{STAGE_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="deal-value">Value (ZAR)</Label>
                <Input
                  id="deal-value"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.value_zar}
                  onChange={(e) => setForm((f) => ({ ...f, value_zar: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal-close">Expected close</Label>
                <Input
                  id="deal-close"
                  type="date"
                  value={form.expected_close}
                  onChange={(e) => setForm((f) => ({ ...f, expected_close: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void submitDealForm()} disabled={!form.title.trim() || !form.contact_id}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
