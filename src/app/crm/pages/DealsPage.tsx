import { useCallback, useEffect, useState } from "react";
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
import { Plus, Pencil, Trash2 } from "lucide-react";

type DealRow = Database["public"]["Tables"]["deals"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];

type DealWithContact = DealRow & {
  contacts: Pick<ContactRow, "company_name"> | null;
};

export function DealsPage() {
  const { user, profile } = useCrmAuth();
  const [rows, setRows] = useState<DealWithContact[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

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
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Deal updated" : "Deal created");
    setDialogOpen(false);
    void load();
  }

  async function confirmDelete() {
    if (!deleteTarget || !user || !profile) return;
    const { error } = await deleteDeal(deleteTarget.id, { id: user.id, role: profile.role });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deal removed");
    setDeleteTarget(null);
    void load();
  }

  function canDelete(row: DealRow) {
    if (isOpsAdmin(profile?.role)) return true;
    if (
      (profile?.role === "quality_officer" || profile?.role === "sales") &&
      row.owner_id === user?.id
    )
      return true;
    return false;
  }

  const filteredRows =
    stageFilter === "all" ? rows : rows.filter((r) => r.stage === stageFilter);

  if (!isCrmDataAvailable()) {
    return (
      <p className="text-sm text-muted-foreground">CRM storage is not available.</p>
    );
  }

  if (!canWrite) {
    return (
      <div className="space-y-2">
        <h2 className="text-2xl font-display font-bold tracking-tight">Deals</h2>
        <p className="text-sm text-muted-foreground">
          Your role can view deals but not create or edit them. Ask a manager if you need changes.
        </p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <DealTableReadOnly
            rows={filteredRows}
            stageFilter={stageFilter}
            setStageFilter={setStageFilter}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight">Deals</h2>
          <p className="text-sm text-muted-foreground">Pipeline linked to contacts.</p>
        </div>
        <Button type="button" onClick={openCreate} disabled={contacts.length === 0}>
          <Plus className="size-4" />
          Add deal
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground">Stage:</span>
        {(["all", "qualification", "proposal", "won", "lost"] as const).map((s) => (
          <Button
            key={s}
            type="button"
            variant={stageFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStageFilter(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Value (ZAR)</TableHead>
                <TableHead>Expected close</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No deals in this view.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell>{row.contacts?.company_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {row.stage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.value_zar != null ? row.value_zar.toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>{row.expected_close ?? "—"}</TableCell>
                    <TableCell className="text-right space-x-1">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit deal" : "New deal"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Contact</Label>
              <Select
                value={form.contact_id}
                onValueChange={(v) => setForm((f) => ({ ...f, contact_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name}
                    </SelectItem>
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
              <Select
                value={form.stage}
                onValueChange={(v) => setForm((f) => ({ ...f, stage: v as DealStage }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qualification">Qualification</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
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
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitDealForm()}
              disabled={!form.title.trim() || !form.contact_id}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

function DealTableReadOnly({
  rows,
  stageFilter,
  setStageFilter,
}: {
  rows: DealWithContact[];
  stageFilter: string;
  setStageFilter: (s: string) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-2 items-center">
        {(["all", "qualification", "proposal", "won", "lost"] as const).map((s) => (
          <Button
            key={s}
            type="button"
            variant={stageFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStageFilter(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>
      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Value (ZAR)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No deals.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.title}</TableCell>
                  <TableCell>{row.contacts?.company_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {row.stage}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.value_zar != null ? row.value_zar.toLocaleString() : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
