import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useCrmAuth } from "../CrmAuthContext";
import { isCrmDataAvailable } from "../../../lib/crm/mode";
import {
  fetchWorkforceEmployees,
  fetchDepartments,
  upsertWorkforceEmployee,
  deleteWorkforceEmployee,
  type WorkforceEmployeeRow,
  type DepartmentRow,
} from "../../../lib/crm/workforceRepo";
import { listProfilesBrief } from "../../../lib/crm/crmRepo";
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
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import type { ProfileShape } from "../../../lib/crm/crmRepo";

const empty = {
  full_name: "",
  employee_number: "",
  rfid_uid: "",
  profile_id: "__none__" as string,
  primary_department_id: "__none__" as string,
  phone: "",
  email: "",
  active: true,
};

export function WorkforceEmployeesPage() {
  const { user } = useCrmAuth();
  const [rows, setRows] = useState<WorkforceEmployeeRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileShape[]>([]);
  const [depts, setDepts] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkforceEmployeeRow | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteTarget, setDeleteTarget] = useState<WorkforceEmployeeRow | null>(null);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [e, p, d] = await Promise.all([fetchWorkforceEmployees(), listProfilesBrief(), fetchDepartments()]);
      setRows(e);
      setProfiles(p);
      setDepts(d.filter((x) => x.active));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setDialogOpen(true);
  };

  const openEdit = (r: WorkforceEmployeeRow) => {
    setEditing(r);
    setForm({
      full_name: r.full_name,
      employee_number: r.employee_number ?? "",
      rfid_uid: r.rfid_uid,
      profile_id: r.profile_id ?? "__none__",
      primary_department_id: r.primary_department_id ?? "__none__",
      phone: r.phone ?? "",
      email: r.email ?? "",
      active: r.active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.full_name.trim() || !form.rfid_uid.trim()) {
      toast.error("Name and RFID UID are required");
      return;
    }
    try {
      await upsertWorkforceEmployee({
        id: editing?.id,
        full_name: form.full_name.trim(),
        employee_number: form.employee_number.trim() || null,
        rfid_uid: form.rfid_uid.trim(),
        profile_id: form.profile_id === "__none__" ? null : form.profile_id,
        primary_department_id: form.primary_department_id === "__none__" ? null : form.primary_department_id,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        active: form.active,
      });
      toast.success(editing ? "Employee updated" : "Employee created");
      setDialogOpen(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWorkforceEmployee(deleteTarget.id);
      toast.success("Employee removed");
      setDeleteTarget(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const filtered = rows.filter(
    (r) =>
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.rfid_uid.toLowerCase().includes(search.toLowerCase()) ||
      (r.employee_number ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <Input
          placeholder="Search name, number, RFID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button type="button" onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add employee
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>RFID</TableHead>
              <TableHead>CRM link</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No employees match.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <Link to={`/crm/workforce/employees/${r.id}`} className="hover:underline inline-flex items-center gap-1">
                      {r.full_name}
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{r.rfid_uid}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.profile_id
                      ? profiles.find((p) => p.id === r.profile_id)?.full_name ?? r.profile_id.slice(0, 8)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {r.active ? <Badge variant="outline">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(r)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit employee" : "New employee"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="wf-name">Full name</Label>
              <Input id="wf-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wf-num">Employee number</Label>
              <Input id="wf-num" value={form.employee_number} onChange={(e) => setForm({ ...form, employee_number: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wf-rfid">RFID UID</Label>
              <Input
                id="wf-rfid"
                className="font-mono"
                value={form.rfid_uid}
                onChange={(e) => setForm({ ...form, rfid_uid: e.target.value })}
                placeholder="Hex or card id from reader"
              />
            </div>
            <div className="grid gap-2">
              <Label>Link CRM user (optional)</Label>
              <Select value={form.profile_id} onValueChange={(v) => setForm({ ...form, profile_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {(p.full_name ?? p.id).slice(0, 40)} ({p.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Primary department</Label>
              <Select
                value={form.primary_department_id}
                onValueChange={(v) => setForm({ ...form, primary_department_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {depts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wf-phone">Phone</Label>
              <Input id="wf-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wf-email">Email</Label>
              <Input id="wf-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="wf-active"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              <Label htmlFor="wf-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the workforce record and related attendance history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
