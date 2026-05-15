import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
import { Link } from "react-router";
import {
  crmUsesSupabase,
  deleteContact,
  isCrmDataAvailable,
  listContacts,
  listProfilesForManager,
  saveContact,
} from "../../../lib/crm/crmRepo";
import { syncSalesLedgerCustomersToContacts } from "../../../lib/crm/ledgerContactsSync";
import { canWriteCommercial, isOpsAdmin } from "../../../lib/crm/roles";
import { useCrmAuth } from "../CrmAuthContext";
import type { ContactType, Database } from "../database.types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
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
import { Building2, History, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "../../components/ui/utils";

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const emptyForm = {
  company_name: "",
  contact_name: "",
  email: "",
  phone: "",
  type: "lead" as ContactType,
  status: "active",
  notes: "",
  owner_id: "",
};

const TYPE_CONFIG: Record<ContactType, { label: string; className: string }> = {
  lead: { label: "Lead", className: "bg-blue-100 text-blue-800 border-blue-200" },
  customer: { label: "Customer", className: "bg-green-100 text-green-800 border-green-200" },
  supplier: { label: "Supplier", className: "bg-amber-100 text-amber-800 border-amber-200" },
};

function typeBadge(type: ContactType) {
  const cfg = TYPE_CONFIG[type] ?? { label: type, className: "" };
  return (
    <Badge variant="outline" className={cn("text-xs font-medium capitalize", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

export function ContactsPage() {
  const { user, profile } = useCrmAuth();
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ContactType>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ContactRow | null>(null);
  const [syncingLedger, setSyncingLedger] = useState(false);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) { setLoading(false); return; }
    setLoading(true);
    try {
      let data = await listContacts();
      setRows(data);
      if (profile && canWriteCommercial(profile.role)) {
        const sync = await syncSalesLedgerCustomersToContacts({ id: user.id, role: profile.role });
        if (sync.error) {
          toast.error(sync.error.message);
        } else if (sync.created > 0) {
          data = await listContacts();
          setRows(data);
          toast.success(`Added ${sync.created} company(ies) from the sales ledger.`);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load contacts");
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  async function manualLedgerSync() {
    if (!isCrmDataAvailable() || !user || !profile || !canWriteCommercial(profile.role)) return;
    setSyncingLedger(true);
    try {
      const sync = await syncSalesLedgerCustomersToContacts({ id: user.id, role: profile.role });
      if (sync.error) { toast.error(sync.error.message); return; }
      if (sync.created > 0) {
        toast.success(`Added ${sync.created} new company(ies) from the sales ledger.`);
      } else {
        toast.message("Sales ledger", { description: "All ledger companies already have customer records." });
      }
      setRows(await listContacts());
    } finally {
      setSyncingLedger(false);
    }
  }

  const loadProfiles = useCallback(async () => {
    if (!user || !isOpsAdmin(profile?.role)) return;
    try {
      const data = await listProfilesForManager();
      setProfiles(data as ProfileRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load team");
    }
  }, [user, profile?.role]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadProfiles(); }, [loadProfiles]);

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

      gsap.utils.toArray<HTMLElement>(".gsap-table-row").forEach((el, i) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, x: -14 },
          {
            autoAlpha: 1, x: 0,
            duration: 0.38, delay: 0.3 + i * 0.035,
            ease: "power2.out",
          }
        );
      });
    }, pageRef);

    return () => ctx.revert();
  }, [loading]);

  function openCreate() {
    if (!user) return;
    setEditing(null);
    setForm({ ...emptyForm, owner_id: user.id, type: profile?.role === "sales" ? "lead" : "customer" });
    setDialogOpen(true);
  }

  function openEdit(row: ContactRow) {
    setEditing(row);
    setForm({
      company_name: row.company_name,
      contact_name: row.contact_name ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      type: row.type,
      status: row.status,
      notes: row.notes ?? "",
      owner_id: row.owner_id,
    });
    setDialogOpen(true);
  }

  async function submitContact() {
    if (!isCrmDataAvailable() || !user || !profile) return;
    const actor = { id: user.id, role: profile.role };
    const base = {
      company_name: form.company_name.trim(),
      contact_name: form.contact_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      type: form.type,
      status: form.status.trim() || "active",
      notes: form.notes.trim() || null,
      owner_id: user.id,
    };
    if (editing) {
      const ownerId = isOpsAdmin(profile.role) && form.owner_id ? form.owner_id : editing.owner_id;
      const { error } = await saveContact({ ...base, id: editing.id, owner_id: ownerId }, actor);
      if (error) { toast.error(error.message); return; }
      toast.success("Contact updated");
    } else {
      const { error } = await saveContact({ ...base, owner_id: user.id }, actor);
      if (error) { toast.error(error.message); return; }
      toast.success("Contact created");
    }
    setDialogOpen(false);
    void load();
  }

  async function confirmDelete() {
    if (!deleteTarget || !user || !profile) return;
    const { error } = await deleteContact(deleteTarget.id, { id: user.id, role: profile.role });
    if (error) { toast.error(error.message); return; }
    toast.success("Contact deleted");
    setDeleteTarget(null);
    void load();
  }

  function canDelete(row: ContactRow) {
    if (isOpsAdmin(profile?.role)) return true;
    if ((profile?.role === "quality_officer" || profile?.role === "sales") && row.owner_id === user?.id) return true;
    return false;
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      return (
        r.company_name.toLowerCase().includes(q) ||
        (r.contact_name?.toLowerCase().includes(q) ?? false) ||
        (r.email?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, search, typeFilter]);

  const counts = useMemo(() => ({
    lead: rows.filter((r) => r.type === "lead").length,
    customer: rows.filter((r) => r.type === "customer").length,
    supplier: rows.filter((r) => r.type === "supplier").length,
  }), [rows]);

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  return (
    <div ref={pageRef} className="space-y-6">
      {/* Header */}
      <div className="gsap-page-header relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/30 p-5 shadow-sm lg:p-6">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[oklch(0.45_0.14_265)] via-[oklch(0.72_0.14_82)] to-[oklch(0.55_0.15_300)]" />
        <div className="pointer-events-none absolute right-0 top-0 size-48 rounded-full bg-[radial-gradient(circle_at_70%_30%,oklch(0.82_0.13_88/0.1),transparent_65%)] blur-2xl" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/15">
                <Building2 className="size-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">CRM / Contacts</span>
            </div>
            <h2 className="text-2xl font-display font-bold tracking-tight lg:text-3xl">Customers</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Companies from the sales ledger are added here automatically. Add leads and suppliers manually.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {profile && canWriteCommercial(profile.role) && (
              <Button
                type="button"
                variant="outline"
                disabled={syncingLedger || loading}
                className="gap-2"
                onClick={() => void manualLedgerSync()}
              >
                <RefreshCw className={cn("size-4", syncingLedger && "animate-spin")} />
                Sync ledger
              </Button>
            )}
            <Button type="button" className="gap-2 shadow-sm" onClick={openCreate}>
              <Plus className="size-4" />
              Add contact
            </Button>
          </div>
        </div>
      </div>

      {/* Quick type stats */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(["lead", "customer", "supplier"] as ContactType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(typeFilter === t ? "all" : t)}
              className={cn(
                "gsap-stat-card crm-card-hover rounded-xl border p-3.5 text-left transition-all duration-200",
                typeFilter === t
                  ? "border-[oklch(0.72_0.14_82/0.5)] bg-[oklch(0.72_0.14_82/0.08)] shadow-[0_0_16px_-4px_oklch(0.72_0.14_82/0.2)]"
                  : "border-border/70 bg-card hover:border-primary/30 hover:bg-muted/30"
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground capitalize">{t}s</p>
              <p className="text-2xl font-display font-bold tabular-nums mt-1">{counts[t]}</p>
            </button>
          ))}
        </div>
      )}

      {/* Search + type filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search company, name, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        {typeFilter !== "all" && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setTypeFilter("all")}>
            Clear filter
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="pb-2 border-b border-border/40 bg-muted/20">
          <CardTitle className="text-base font-display">
            {typeFilter === "all" ? "All contacts" : `${typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}s`}
          </CardTitle>
          <CardDescription>
            {loading ? "Loading…" : `${filtered.length} of ${rows.length} contact${rows.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading contacts…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Building2 className="size-8 opacity-30" />
                          <p className="text-sm">{search ? "No contacts match your search." : "No contacts yet."}</p>
                          {!search && (
                            <Button type="button" size="sm" variant="outline" onClick={openCreate}>
                              <Plus className="size-4" /> Add first contact
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((row, i) => (
                      <TableRow key={row.id} className={cn("gsap-table-row transition-colors hover:bg-muted/40", i % 2 !== 0 ? "bg-muted/20" : "")}>
                        <TableCell className="font-medium">{row.company_name}</TableCell>
                        <TableCell>
                          <div className="text-sm">{row.contact_name ?? "—"}</div>
                          {row.email ? (
                            <a href={`mailto:${row.email}`} className="text-xs text-primary hover:underline">
                              {row.email}
                            </a>
                          ) : null}
                        </TableCell>
                        <TableCell>{typeBadge(row.type)}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "text-xs font-medium",
                            row.status === "active" ? "text-green-700" : "text-muted-foreground"
                          )}>
                            {row.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            {crmUsesSupabase() && (
                              <Button variant="ghost" size="icon" asChild aria-label="Contact logs">
                                <Link to={`/crm/contacts/${row.id}/logs`}>
                                  <History className="size-4" />
                                </Link>
                              </Button>
                            )}
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit / Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit contact" : "New contact"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cc-company">Company name *</Label>
              <Input
                id="cc-company"
                value={form.company_name}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-name">Contact name</Label>
              <Input
                id="cc-name"
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cc-email">Email</Label>
                <Input
                  id="cc-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cc-phone">Phone</Label>
                <Input
                  id="cc-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as ContactType }))}
                  disabled={!editing && profile?.role === "sales"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cc-status">Status</Label>
                <Input
                  id="cc-status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                />
              </div>
            </div>
            {editing && isOpsAdmin(profile?.role) && profiles.length > 0 && (
              <div className="space-y-2">
                <Label>Owner</Label>
                <Select value={form.owner_id} onValueChange={(v) => setForm((f) => ({ ...f, owner_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name ?? p.id.slice(0, 8)} ({p.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="cc-notes">Notes</Label>
              <Textarea
                id="cc-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void submitContact()} disabled={!form.company_name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Related deals may remain until removed separately.
            </AlertDialogDescription>
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
