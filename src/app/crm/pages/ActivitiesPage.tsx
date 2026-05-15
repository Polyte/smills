import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  insertActivity,
  isCrmDataAvailable,
  listActivities,
  listContactsBrief,
  listDealsBrief,
} from "../../../lib/crm/crmRepo";
import { useCrmAuth } from "../CrmAuthContext";
import type { ActivityKind, Database } from "../database.types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
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
import { Activity, CalendarDays, Loader2, Mail, MessageSquare, Phone, Plus } from "lucide-react";
import { cn } from "../../components/ui/utils";

gsap.registerPlugin(ScrollTrigger);

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type DealRow = Database["public"]["Tables"]["deals"]["Row"];

type ActivityJoined = ActivityRow & {
  contacts: Pick<ContactRow, "company_name"> | null;
  deals: Pick<DealRow, "title"> | null;
};

const KIND_CONFIG: Record<
  ActivityKind,
  { label: string; icon: typeof Phone; color: string; bg: string; ring: string; dot: string }
> = {
  call: {
    label: "Call",
    icon: Phone,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    ring: "ring-blue-500/25",
    dot: "bg-blue-500",
  },
  email: {
    label: "Email",
    icon: Mail,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    ring: "ring-violet-500/25",
    dot: "bg-violet-500",
  },
  meeting: {
    label: "Meeting",
    icon: CalendarDays,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    ring: "ring-emerald-500/25",
    dot: "bg-emerald-500",
  },
  note: {
    label: "Note",
    icon: MessageSquare,
    color: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-500/10 dark:bg-slate-500/15",
    ring: "ring-slate-400/25",
    dot: "bg-slate-400",
  },
};

export function ActivitiesPage() {
  const { user, profile } = useCrmAuth();
  const pageRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<ActivityJoined[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactFilter, setContactFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<ActivityKind | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    kind: "note" as ActivityKind,
    subject: "",
    body: "",
    occurred_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    contact_id: "",
    deal_id: "",
  });

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await listActivities(contactFilter === "all" ? null : contactFilter);
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load activities");
    } finally {
      setLoading(false);
    }
  }, [user, contactFilter]);

  const loadRefs = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) return;
    try {
      const [c, d] = await Promise.all([listContactsBrief(), listDealsBrief()]);
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
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".act-header", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" });
      gsap.fromTo(".act-filters", { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out", delay: 0.15 });
      gsap.utils.toArray<HTMLElement>(".act-item").forEach((el, i) => {
        gsap.fromTo(el,
          { autoAlpha: 0, x: -18 },
          {
            autoAlpha: 1, x: 0, duration: 0.45, delay: i * 0.04,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 92%", toggleActions: "play none none reverse" },
          }
        );
      });
    }, pageRef);
    return () => ctx.revert();
  }, [loading, rows]);

  function openCreate() {
    setForm({
      kind: "call",
      subject: "",
      body: "",
      occurred_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      contact_id: "",
      deal_id: "",
    });
    setDialogOpen(true);
  }

  async function saveActivity() {
    if (!isCrmDataAvailable() || !user || !profile) return;
    const { error } = await insertActivity(
      {
        kind: form.kind,
        subject: form.subject.trim(),
        body: form.body.trim() || null,
        occurred_at: new Date(form.occurred_at).toISOString(),
        contact_id: form.contact_id || null,
        deal_id: form.deal_id || null,
        created_by: user.id,
      },
      { id: user.id, role: profile.role }
    );
    if (error) { toast.error(error.message); return; }
    toast.success("Activity logged");
    setDialogOpen(false);
    void load();
  }

  const dealsForContact = form.contact_id === "" ? deals : deals.filter((d) => d.contact_id === form.contact_id);

  const filtered = kindFilter === "all" ? rows : rows.filter((r) => r.kind === kindFilter);

  const kindCounts = (["call", "email", "meeting", "note"] as ActivityKind[]).reduce(
    (acc, k) => ({ ...acc, [k]: rows.filter((r) => r.kind === k).length }),
    {} as Record<ActivityKind, number>
  );

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  return (
    <div ref={pageRef} className="space-y-6">
      {/* Premium header */}
      <div className="act-header relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_4px_24px_-8px_oklch(0.18_0.03_265/0.12),inset_0_1px_0_oklch(1_0_0/0.06)]">
        <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-[oklch(0.55_0.16_280)] via-[oklch(0.72_0.14_82)] to-[oklch(0.6_0.15_200)]" />
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-[radial-gradient(circle,oklch(0.72_0.14_82/0.08),transparent_70%)] blur-2xl" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.55_0.16_280/0.18)] to-[oklch(0.55_0.16_280/0.08)] text-[oklch(0.5_0.16_280)] shadow-sm ring-1 ring-[oklch(0.55_0.16_280/0.25)]">
              <Activity className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Activities</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {loading ? "Loading…" : `${rows.length} log${rows.length !== 1 ? "s" : ""} — calls, emails, meetings, notes`}
              </p>
            </div>
          </div>
          <Button type="button" onClick={openCreate} className="gap-2 shrink-0 shadow-sm">
            <Plus className="size-4" />
            Log activity
          </Button>
        </div>
      </div>

      {/* Filters row */}
      <div className="act-filters flex flex-wrap items-center gap-3">
        {/* Kind pills */}
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/50 bg-muted/30 p-1">
          <button
            onClick={() => setKindFilter("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all duration-200",
              kindFilter === "all"
                ? "bg-card shadow-sm text-foreground border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            All · {rows.length}
          </button>
          {(["call", "email", "meeting", "note"] as ActivityKind[]).map((k) => {
            const cfg = KIND_CONFIG[k];
            const Icon = cfg.icon;
            return (
              <button
                key={k}
                onClick={() => setKindFilter(k)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all duration-200",
                  kindFilter === k
                    ? cn("bg-card shadow-sm border border-border/60", cfg.color)
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Icon className="size-3" />
                {cfg.label} · {kindCounts[k]}
              </button>
            );
          })}
        </div>

        {/* Contact filter */}
        <Select value={contactFilter} onValueChange={setContactFilter}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="All contacts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All contacts</SelectItem>
            {contacts.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {contactFilter !== "all" && (
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setContactFilter("all")}>
            Clear filter
          </Button>
        )}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading activities…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/70 bg-muted/10 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted/50">
            <MessageSquare className="size-6 text-muted-foreground opacity-50" />
          </div>
          <div>
            <p className="font-semibold text-foreground">No activities yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Log a call, email, meeting, or note to get started.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={openCreate} className="gap-2">
            <Plus className="size-4" /> Log first activity
          </Button>
        </div>
      ) : (
        <div className="relative space-y-3">
          {/* Timeline line */}
          <div className="pointer-events-none absolute left-[19px] top-6 bottom-6 w-px bg-gradient-to-b from-border/80 via-border/40 to-transparent" />

          {filtered.map((row, i) => {
            const cfg = KIND_CONFIG[row.kind] ?? KIND_CONFIG.note;
            const Icon = cfg.icon;
            return (
              <div
                key={row.id}
                className="act-item group relative flex gap-4 opacity-0"
              >
                {/* Timeline dot */}
                <div className={cn(
                  "relative z-10 mt-3.5 flex size-10 shrink-0 items-center justify-center rounded-full shadow-sm ring-2 ring-background transition-transform duration-200 group-hover:scale-110",
                  cfg.bg, cfg.ring.replace("ring-", "ring-")
                )}>
                  <div className={cn("absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-background", cfg.dot)} />
                  <Icon className={cn("size-4", cfg.color)} />
                </div>

                {/* Card */}
                <div className="flex-1 min-w-0 rounded-2xl border border-border/60 bg-card px-4 py-3.5 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md hover:-translate-y-0.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className={cn("text-[11px] font-black uppercase tracking-widest", cfg.color)}>
                        {cfg.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(row.occurred_at), "PPp")}
                      </span>
                    </div>
                    {i === 0 && (
                      <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                        Latest
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-foreground leading-snug">{row.subject}</p>
                  {row.body && (
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap border-t border-border/40 pt-1.5">
                      {row.body}
                    </p>
                  )}
                  {(row.contacts?.company_name || row.deals?.title) && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground border-t border-border/40 pt-2">
                      {row.contacts?.company_name && (
                        <span className="inline-flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                          {row.contacts.company_name}
                        </span>
                      )}
                      {row.deals?.title && (
                        <span className="inline-flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                          {row.deals.title}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log activity dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Log activity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Kind</Label>
              <div className="grid grid-cols-4 gap-2">
                {(["call", "email", "meeting", "note"] as ActivityKind[]).map((k) => {
                  const cfg = KIND_CONFIG[k];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, kind: k }))}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all duration-200",
                        form.kind === k
                          ? cn("border-transparent shadow-sm ring-1", cfg.bg, cfg.color, cfg.ring)
                          : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30"
                      )}
                    >
                      <Icon className="size-4" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="act-subject" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Subject *</Label>
              <Input
                id="act-subject"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="h-9"
                placeholder="What happened?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="act-when" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">When</Label>
              <Input
                id="act-when"
                type="datetime-local"
                value={form.occurred_at}
                onChange={(e) => setForm((f) => ({ ...f, occurred_at: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contact</Label>
                <Select
                  value={form.contact_id || "__none__"}
                  onValueChange={(v) => setForm((f) => ({ ...f, contact_id: v === "__none__" ? "" : v, deal_id: "" }))}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Deal</Label>
                <Select
                  value={form.deal_id || "__none__"}
                  onValueChange={(v) => setForm((f) => ({ ...f, deal_id: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {dealsForContact.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="act-body" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Details</Label>
              <Textarea
                id="act-body"
                rows={3}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Notes, outcomes, follow-up actions…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void saveActivity()} disabled={!form.subject.trim()}>
              Save activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
