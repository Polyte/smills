import { useCallback, useEffect, useState } from "react";
import {
  crmUsesSupabase,
  deleteContact,
  isCrmDataAvailable,
  listContacts,
  listProfilesForManager,
  saveContact,
} from "../../../lib/crm/crmRepo";
import { useCrmAuth } from "../CrmAuthContext";
import type { ContactType, Database } from "../database.types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
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
import { Plus, Pencil, Trash2, History } from "lucide-react";
import { Link } from "react-router";

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

export function ContactsPage() {
  const { user, profile } = useCrmAuth();
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ContactRow | null>(null);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listContacts();
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load contacts");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadProfiles = useCallback(async () => {
    if (!user || (profile?.role !== "admin" && profile?.role !== "production_manager")) return;
    try {
      const data = await listProfilesForManager();
      setProfiles(data as ProfileRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load team");
    }
  }, [user, profile?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  function openCreate() {
    if (!user) return;
    setEditing(null);
    setForm({
      ...emptyForm,
      owner_id: user.id,
      type: profile?.role === "sales" ? "lead" : "customer",
    });
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
      const ownerId =
        (profile.role === "admin" || profile.role === "production_manager") && form.owner_id
          ? form.owner_id
          : editing.owner_id;
      const { error } = await saveContact({ ...base, id: editing.id, owner_id: ownerId }, actor);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Contact updated");
    } else {
      const { error } = await saveContact({ ...base, owner_id: user.id }, actor);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Contact created");
    }
    setDialogOpen(false);
    void load();
  }

  async function confirmDelete() {
    if (!deleteTarget || !user || !profile) return;
    const { error } = await deleteContact(deleteTarget.id, { id: user.id, role: profile.role });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contact deleted");
    setDeleteTarget(null);
    void load();
  }

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.company_name.toLowerCase().includes(q) ||
      (r.contact_name?.toLowerCase().includes(q) ?? false) ||
      (r.email?.toLowerCase().includes(q) ?? false)
    );
  });

  function canDelete(row: ContactRow) {
    if (profile?.role === "admin" || profile?.role === "production_manager") return true;
    if (
      (profile?.role === "quality_officer" || profile?.role === "sales") &&
      row.owner_id === user?.id
    )
      return true;
    return false;
  }

  if (!isCrmDataAvailable()) {
    return (
      <p className="text-sm text-muted-foreground">CRM storage is not available.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight">Contacts</h2>
          <p className="text-sm text-muted-foreground">
            Leads, customers, and suppliers. Staff can add leads they own.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" />
          Add contact
        </Button>
      </div>

      <Input
        placeholder="Search company, name, email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={5} className="text-muted-foreground text-center py-8">
                    No contacts yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.company_name}</TableCell>
                    <TableCell>
                      <div className="text-sm">{row.contact_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{row.email ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {row.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {crmUsesSupabase() ? (
                        <Button variant="ghost" size="icon" asChild aria-label="Contact logs">
                          <Link to={`/crm/contacts/${row.id}/logs`}>
                            <History className="size-4" />
                          </Link>
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Edit"
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {canDelete(row) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Delete"
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit contact" : "New contact"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cc-company">Company name</Label>
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
            {editing &&
            (profile?.role === "admin" || profile?.role === "production_manager") &&
            profiles.length > 0 ? (
              <div className="space-y-2">
                <Label>Owner</Label>
                <Select
                  value={form.owner_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, owner_id: v }))}
                >
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
            ) : null}
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
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitContact()} disabled={!form.company_name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
