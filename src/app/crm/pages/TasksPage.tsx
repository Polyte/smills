import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  completeTask,
  insertTask,
  isCrmDataAvailable,
  listContactsBrief,
  listDealsBrief,
  listProfilesBrief,
  listTasks,
} from "../../../lib/crm/crmRepo";
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
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { Plus, CheckCircle2 } from "lucide-react";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type DealRow = Database["public"]["Tables"]["deals"]["Row"];

type TaskJoined = TaskRow & {
  assignee: Pick<ProfileRow, "full_name"> | null;
  contacts: Pick<ContactRow, "company_name"> | null;
};

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

  const isStaff = profile?.role === "staff";
  const canAssignOthers = profile?.role === "manager" || profile?.role === "employee";

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
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
      const [p, c, d] = await Promise.all([
        listProfilesBrief(),
        listContactsBrief(),
        listDealsBrief(),
      ]);
      setProfiles(p as ProfileRow[]);
      setContacts(c as ContactRow[]);
      setDeals(d as DealRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load references");
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadRefs();
  }, [loadRefs]);

  function openCreate() {
    setForm({
      title: "",
      due_at: "",
      assignee_id: user?.id ?? "",
      contact_id: "",
      deal_id: "",
    });
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
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Task created");
    setDialogOpen(false);
    void load();
  }

  async function markDone(task: TaskRow) {
    if (!isCrmDataAvailable() || !user || !profile) return;
    const { error } = await completeTask(task.id, { id: user.id, role: profile.role });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marked done");
    void load();
  }

  const dealsForContact =
    form.contact_id === "" ? deals : deals.filter((d) => d.contact_id === form.contact_id);

  if (!isCrmDataAvailable()) {
    return (
      <p className="text-sm text-muted-foreground">CRM storage is not available.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight">Tasks</h2>
          <p className="text-sm text-muted-foreground">
            Follow-ups assigned to you or the team.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" />
          New task
        </Button>
      </div>

      {!isStaff ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant={scope === "mine" ? "default" : "outline"}
            size="sm"
            onClick={() => setScope("mine")}
          >
            Mine
          </Button>
          <Button
            type="button"
            variant={scope === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setScope("all")}
          >
            All
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No tasks.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell>{row.assignee?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      {row.due_at ? format(new Date(row.due_at), "PP") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === "open" ? "default" : "secondary"}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.contacts?.company_name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {row.status === "open" &&
                      (profile?.role === "manager" ||
                        profile?.role === "employee" ||
                        row.assignee_id === user?.id) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void markDone(row)}
                        >
                          <CheckCircle2 className="size-4" />
                          Done
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
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
            {canAssignOthers && profiles.length > 0 ? (
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
            ) : null}
            <div className="space-y-2">
              <Label>Contact (optional)</Label>
              <Select
                value={form.contact_id || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    contact_id: v === "__none__" ? "" : v,
                    deal_id: "",
                  }))
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
            <Button type="button" onClick={() => void saveTask()} disabled={!form.title.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
