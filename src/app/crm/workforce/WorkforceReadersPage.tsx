import { useCallback, useEffect, useState } from "react";
import { useCrmAuth } from "../CrmAuthContext";
import { isCrmDataAvailable } from "../../../lib/crm/mode";
import {
  fetchReaders,
  fetchDepartments,
  upsertReader,
  deleteReader,
  type AccessReaderRow,
  type ReaderKind,
  type DepartmentRow,
} from "../../../lib/crm/workforceRepo";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

const empty = {
  name: "",
  reader_key: "",
  kind: "facility_in" as ReaderKind,
  department_id: "__none__" as string,
};

export function WorkforceReadersPage() {
  const { user } = useCrmAuth();
  const [rows, setRows] = useState<AccessReaderRow[]>([]);
  const [depts, setDepts] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccessReaderRow | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteTarget, setDeleteTarget] = useState<AccessReaderRow | null>(null);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [r, d] = await Promise.all([fetchReaders(), fetchDepartments()]);
      setRows(r);
      setDepts(d.filter((x) => x.active));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
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

  const openEdit = (r: AccessReaderRow) => {
    setEditing(r);
    setForm({
      name: r.name,
      reader_key: r.reader_key,
      kind: r.kind,
      department_id: r.department_id ?? "__none__",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.reader_key.trim()) {
      toast.error("Name and reader key required");
      return;
    }
    if (form.kind === "department" && form.department_id === "__none__") {
      toast.error("Department readers require a department");
      return;
    }
    try {
      await upsertReader({
        id: editing?.id,
        name: form.name.trim(),
        reader_key: form.reader_key.trim(),
        kind: form.kind,
        department_id: form.kind === "department" ? form.department_id : null,
      });
      toast.success(editing ? "Updated" : "Created");
      setDialogOpen(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await deleteReader(deleteTarget.id);
      toast.success("Deleted");
      setDeleteTarget(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const deptName = (id: string | null) => depts.find((d) => d.id === id)?.name ?? id ?? "—";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground max-w-2xl">
        Each physical reader sends its <code className="bg-muted px-1 rounded">reader_key</code> to the RFID ingest
        endpoint. Gate uses <strong>facility in</strong> / <strong>facility out</strong>; department doors use{" "}
        <strong>department</strong> with a linked department.
      </p>
      <div className="flex justify-end">
        <Button type="button" onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add reader
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Reader key</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No readers. Add gate readers and department readers to match your Arduino setup.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="font-mono text-sm">{r.reader_key}</TableCell>
                  <TableCell className="text-sm capitalize">{r.kind.replace("_", " ")}</TableCell>
                  <TableCell className="text-sm">{r.kind === "department" ? deptName(r.department_id) : "—"}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteTarget(r)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit reader" : "New reader"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Display name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Reader key (Arduino sends this)</Label>
              <Input
                className="font-mono"
                value={form.reader_key}
                onChange={(e) => setForm({ ...form, reader_key: e.target.value })}
                placeholder="e.g. gate_in_main"
              />
            </div>
            <div className="grid gap-2">
              <Label>Kind</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => setForm({ ...form, kind: v as ReaderKind })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facility_in">Facility in</SelectItem>
                  <SelectItem value="facility_out">Facility out</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.kind === "department" && (
              <div className="grid gap-2">
                <Label>Department</Label>
                <Select
                  value={form.department_id}
                  onValueChange={(v) => setForm({ ...form, department_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {depts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
            <AlertDialogTitle>Delete reader?</AlertDialogTitle>
            <AlertDialogDescription>Arduino devices using this key will fail until reconfigured.</AlertDialogDescription>
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
