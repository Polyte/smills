import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
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
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type DealRow = Database["public"]["Tables"]["deals"]["Row"];

type ActivityJoined = ActivityRow & {
  contacts: Pick<ContactRow, "company_name"> | null;
  deals: Pick<DealRow, "title"> | null;
};

export function ActivitiesPage() {
  const { user, profile } = useCrmAuth();
  const [rows, setRows] = useState<ActivityJoined[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactFilter, setContactFilter] = useState<string>("all");
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
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
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

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadRefs();
  }, [loadRefs]);

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
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Activity logged");
    setDialogOpen(false);
    void load();
  }

  const dealsForContact =
    form.contact_id === ""
      ? deals
      : deals.filter((d) => d.contact_id === form.contact_id);

  if (!isCrmDataAvailable()) {
    return (
      <p className="text-sm text-muted-foreground">CRM storage is not available.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight">Activities</h2>
          <p className="text-sm text-muted-foreground">Calls, emails, meetings, and notes.</p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" />
          Log activity
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="act-filter" className="text-muted-foreground shrink-0">
          Contact
        </Label>
        <Select value={contactFilter} onValueChange={setContactFilter}>
          <SelectTrigger id="act-filter" className="w-[220px]">
            <SelectValue placeholder="All contacts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All contacts</SelectItem>
            {contacts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <ScrollArea className="h-[min(560px,65vh)] rounded-md border border-border bg-card p-4">
          <ul className="space-y-4">
            {rows.length === 0 ? (
              <li className="text-sm text-muted-foreground text-center py-12">No activities yet.</li>
            ) : (
              rows.map((row) => (
                <li
                  key={row.id}
                  className="border-b border-border/80 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {row.kind}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(row.occurred_at), "PPp")}
                    </span>
                  </div>
                  <p className="font-medium mt-1">{row.subject}</p>
                  {row.body ? (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{row.body}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground mt-2">
                    {row.contacts?.company_name ? `Contact: ${row.contacts.company_name}` : null}
                    {row.contacts?.company_name && row.deals?.title ? " · " : ""}
                    {row.deals?.title ? `Deal: ${row.deals.title}` : ""}
                    {!row.contacts?.company_name && !row.deals?.title ? "—" : ""}
                  </p>
                </li>
              ))
            )}
          </ul>
        </ScrollArea>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log activity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Kind</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => setForm((f) => ({ ...f, kind: v as ActivityKind }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="act-subject">Subject</Label>
              <Input
                id="act-subject"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="act-when">When</Label>
              <Input
                id="act-when"
                type="datetime-local"
                value={form.occurred_at}
                onChange={(e) => setForm((f) => ({ ...f, occurred_at: e.target.value }))}
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="act-body">Details</Label>
              <Textarea
                id="act-body"
                rows={3}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveActivity()} disabled={!form.subject.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
