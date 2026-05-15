import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isPast, parseISO } from "date-fns";
import {
  completeTask,
  insertTask,
  isCrmDataAvailable,
  listContactsBrief,
  listDealsBrief,
  listProfilesBrief,
  listTasks,
} from "../../../lib/crm/crmRepo";
import { isOpsAdmin } from "../../../lib/crm/roles";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database } from "../database.types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
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
import { toast } from "sonner";
import { CheckCircle2, ClipboardList, Plus } from "lucide-react";
import { cn } from "../../components/ui/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import {
  CrmTableScroll,
  CrmTableSkeleton,
  crmFactoryIconWrapClass,
  crmFactoryPrimaryButtonClass,
} from "../components/crmDataUi";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSmoothScroll } from "../hooks/useSmoothScroll";

gsap.registerPlugin(ScrollTrigger);

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type DealRow = Database["public"]["Tables"]["deals"]["Row"];

type TaskJoined = TaskRow & {
  assignee: Pick<ProfileRow, "full_name"> | null;
  contacts: Pick<ContactRow, "company_name"> | null;
};

function isOverdue(task: TaskJoined): boolean {
  if (task.status !== "open" || !task.due_at) return false;
  return isPast(parseISO(task.due_at));
}

export function TasksPage() {
  const { user, profile } = useCrmAuth();
  const [rows, setRows] = useState<TaskJoined[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    due_at: "",
    assignee_id: "",
    contact_id: "",
    deal_id: "",
  });
  const pageRef = useRef<HTMLDivElement>(null);
  useSmoothScroll();

  const isStaff = profile?.role === "sales";
  const canAssignOthers = isOpsAdmin(profile?.role) || profile?.role === "quality_officer";

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await listTasks(scope, user.id);
      setRows(data as TaskJoined[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load tasks");
    } finally {
      setLoading(false);
    }
  }, [user, scope]);

  const loadRefs = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) return;
    try {
      const [p, c, d] = await Promise.all([listProfilesBrief(), listContactsBrief(), listDealsBrief()]);
      setProfiles(p as ProfileRow[]);
      setContacts(c as ContactRow[]);
      setDeals(d as DealRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load references");
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadRefs(); }, [loadRefs]);

  useEffect(() => {
    if (loading || !pageRef.current) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      gsap.set(".task-header, .task-stat, .task-row", { autoAlpha: 1 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(".task-header",
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }
      );
      gsap.fromTo(".task-stat",
        { autoAlpha: 0, y: 16, scale: 0.97 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.4)", stagger: 0.08, delay: 0.15 }
      );
      gsap.utils.toArray<HTMLElement>(".task-row").forEach((el, i) => {
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
  }, [loading, rows]);

  function openCreate() {
    setForm({ title: "", due_at: "", assignee_id: user?.id ?? "", contact_id: "", deal_id: "" });
    setDialogOpen(true);
  }

  async function saveTask() {
    if (!isCrmDataAvailable() || !user || !profile) return;
    const assigneeId = canAssignOthers && form.assignee_id ? form.assignee_id : user.id;
    const { error } = await insertTask(
      {
        title: form.title.trim(),
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
        assignee_id: assigneeId,
        contact_id: form.contact_id || null,
        deal_id: form.deal_id || null,
      },
      { id: user.id, role: profile.role }
    );
    if (error) { toast.error(error.message); return; }
    toast.success("Task created");
    setDialogOpen(false);
    void load();
  }

  async function markDone(task: TaskRow) {
    if (!isCrmDataAvailable() || !user || !profile) return;
    const { error } = await completeTask(task.id, { id: user.id, role: profile.role });
    if (error) { toast.error(error.message); return; }
    toast.success("Marked done");
    void load();
  }

  const dealsForContact = form.contact_id === "" ? deals : deals.filter((d) => d.contact_id === form.contact_id);

  const stats = useMemo(() => ({
    open: rows.filter((r) => r.status === "open").length,
    overdue: rows.filter((r) => isOverdue(r)).length,
    done: rows.filter((r) => r.status !== "open").length,
  }), [rows]);

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  return (
    <div ref={pageRef} className="space-y-6">
      {/* Header */}
      <div className="task-header flex flex-col gap-4 opacity-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={crmFactoryIconWrapClass}>
            <ClipboardList className="size-5 text-[var(--crm-factory-accent)]" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-normal tracking-tight text-foreground">Tasks</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Follow-ups assigned to you or the team.</p>
          </div>
        </div>
        <button type="button" onClick={openCreate} className={cn(crmFactoryPrimaryButtonClass, "shrink-0")}>
          <Plus className="size-4" />
          New task
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="task-stat rounded-xl border border-border/70 bg-card p-4 opacity-0 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Open</p>
          <p className="mt-1 font-display text-[28px] font-normal leading-none tracking-tight text-foreground tabular-nums">
            {stats.open}
          </p>
        </div>
        <div
          className={cn(
            "task-stat rounded-xl border p-4 opacity-0 shadow-sm",
            stats.overdue > 0
              ? "border-destructive/25 bg-destructive/[0.06]"
              : "border-border/70 bg-card",
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Overdue</p>
          <p
            className={cn(
              "mt-1 font-display text-[28px] font-normal leading-none tracking-tight tabular-nums",
              stats.overdue > 0 ? "text-destructive" : "text-foreground",
            )}
          >
            {stats.overdue}
          </p>
        </div>
        <div className="task-stat rounded-xl border border-border/70 bg-muted/20 p-4 opacity-0 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Completed</p>
          <p className="mt-1 font-display text-[28px] font-normal leading-none tracking-tight text-muted-foreground tabular-nums">
            {stats.done}
          </p>
        </div>
      </div>

      {!isStaff && (
        <div className="flex flex-wrap gap-2">
          {(["mine", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={cn(
                "min-h-10 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
                scope === s
                  ? "border-transparent bg-[var(--crm-factory-accent)] text-white shadow-sm"
                  : "border-border/70 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              {s === "mine" ? "Mine" : "All team"}
            </button>
          ))}
        </div>
      )}

      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/40 bg-muted/15 pb-3">
          <CardTitle className="text-base text-foreground">{scope === "mine" ? "My tasks" : "All tasks"}</CardTitle>
          <CardDescription>
            {loading
              ? "Loading…"
              : `${rows.length} task${rows.length !== 1 ? "s" : ""}${stats.overdue > 0 ? ` · ${stats.overdue} overdue` : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 sm:p-5">
              <CrmTableScroll>
                <CrmTableSkeleton columnCount={6} rowCount={7} />
              </CrmTableScroll>
            </div>
          ) : (
            <CrmTableScroll className="sm:px-0">
              <Table>
              <TableHeader>
                <TableRow className="border-border/60 bg-muted/30 hover:bg-muted/30">
                  {["Task", "Assignee", "Due", "Status", "Contact", ""].map((h) => (
                    <TableHead
                      key={h}
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                        h === "" && "w-[100px] text-right",
                      )}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <ClipboardList className="size-9 opacity-25" />
                        <p className="text-sm">No tasks yet.</p>
                        <Button type="button" variant="outline" size="sm" className="min-h-10 gap-1.5" onClick={openCreate}>
                          <Plus className="size-4" /> Create first task
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const overdue = isOverdue(row);
                    return (
                      <TableRow
                        key={row.id}
                        className={cn(
                          "task-row border-border/50 opacity-0 transition-colors duration-150 hover:bg-muted/25",
                          overdue && "bg-destructive/[0.04]",
                        )}
                      >
                        <TableCell>
                          <div className={cn("text-sm font-medium", overdue ? "text-destructive" : "text-foreground")}>
                            {row.title}
                          </div>
                          {overdue && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive">
                              Overdue
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.assignee?.full_name ?? "—"}</TableCell>
                        <TableCell
                          className={cn(
                            "font-mono text-sm",
                            overdue ? "text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {row.due_at ? format(parseISO(row.due_at), "PP") : "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                              row.status === "open"
                                ? "border-border/70 bg-muted/40 text-foreground"
                                : "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
                            )}
                          >
                            {row.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.contacts?.company_name ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {row.status === "open" &&
                          (isOpsAdmin(profile?.role) ||
                            profile?.role === "quality_officer" ||
                            row.assignee_id === user?.id) ? (
                            <button
                              type="button"
                              onClick={() => void markDone(row)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-800 transition-all duration-150 hover:scale-105 active:scale-95 dark:text-emerald-300"
                            >
                              <CheckCircle2 className="size-3.5" />
                              Done
                            </button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </CrmTableScroll>
          )}
        </CardContent>
      </Card>

      {/* New task dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={form.due_at}
                onChange={(e) => setForm((f) => ({ ...f, due_at: e.target.value }))}
              />
            </div>
            {canAssignOthers && profiles.length > 0 && (
              <div className="space-y-2">
                <Label>Assign to</Label>
                <Select
                  value={form.assignee_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, assignee_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name ?? p.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Contact (optional)</Label>
              <Select
                value={form.contact_id || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, contact_id: v === "__none__" ? "" : v, deal_id: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Deal (optional)</Label>
              <Select
                value={form.deal_id || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, deal_id: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {dealsForContact.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={() => void saveTask()}
              disabled={!form.title.trim()}
              className={cn(crmFactoryPrimaryButtonClass, "disabled:opacity-50")}
            >
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
