import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useCrmAuth } from "../CrmAuthContext";
import { crmUsesSupabase } from "../../../lib/crm/crmRepo";
import {
  deleteContactDocument,
  getContactDocumentSignedUrl,
  insertContactLog,
  listContactDocuments,
  listContactLogs,
  uploadContactDocument,
  type ContactDocumentRow,
  type ContactLogRow,
} from "../../../lib/crm/factoryRepo";
import { isOpsAdmin } from "../../../lib/crm/roles";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "sonner";
import { Paperclip, Trash2 } from "lucide-react";
import { crmFactoryLinkClass } from "../components/crmDataUi";
import { cn } from "../../components/ui/utils";

export function ContactLogsPage() {
  const { contactId } = useParams();
  const { user, profile } = useCrmAuth();
  const [rows, setRows] = useState<ContactLogRow[]>([]);
  const [docs, setDocs] = useState<ContactDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const canDeleteDocs = isOpsAdmin(profile?.role);

  const load = useCallback(async () => {
    if (!crmUsesSupabase() || !contactId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [logs, d] = await Promise.all([listContactLogs(contactId), listContactDocuments(contactId)]);
      setRows(logs);
      setDocs(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDoc(row: ContactDocumentRow) {
    try {
      const url = await getContactDocumentSignedUrl(row.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open file");
    }
  }

  if (!crmUsesSupabase()) {
    return <p className="text-sm text-muted-foreground">Contact logs require Supabase.</p>;
  }

  if (!contactId) {
    return <p className="text-sm text-muted-foreground">Missing contact.</p>;
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4" data-gsap-section>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-16 w-full max-w-xl" />
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-24" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4" data-gsap-section>
      <Link to="/crm/contacts" className={cn("text-xs", crmFactoryLinkClass)}>
        ← Customers
      </Link>
      <div>
        <h1 className="text-2xl font-display font-normal tracking-tight text-foreground">Contact activity</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Notes and calls are logged below. Upload contracts, MSDS, or supplier specs — stored privately; team members
          open files via a short-lived signed link.
        </p>
      </div>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Paperclip className="size-4 shrink-0" aria-hidden />
            Documents
          </CardTitle>
          <CardDescription>Files are private; opens use a short-lived signed URL.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f || !user || !contactId) return;
              void uploadContactDocument({ contactId, file: f, uploadedBy: user.id })
                .then(() => {
                  toast.success("Uploaded");
                  void load();
                })
                .catch((err) => toast.error(err instanceof Error ? err.message : "Upload failed"));
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-10"
            disabled={!user}
            onClick={() => fileRef.current?.click()}
          >
            Upload file
          </Button>
          <ul className="max-h-48 divide-y overflow-y-auto rounded-md border border-border/60 text-sm">
            {docs.length === 0 ? (
              <li className="px-3 py-4 text-center text-muted-foreground">No documents yet.</li>
            ) : (
              docs.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    className={cn(
                      crmFactoryLinkClass,
                      "max-w-[min(100%,220px)] truncate text-left text-sm hover:underline",
                    )}
                    onClick={() => void openDoc(d)}
                  >
                    {d.file_name}
                  </button>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {new Date(d.created_at).toLocaleString()}
                  </span>
                  {canDeleteDocs ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0 text-destructive"
                      aria-label="Delete document"
                      onClick={() =>
                        void deleteContactDocument(d.id)
                          .then(() => {
                            toast.success("Removed");
                            void load();
                          })
                          .catch((err) => toast.error(err instanceof Error ? err.message : "Delete failed"))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Log entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="min-h-10" />
          <Textarea placeholder="Details" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
          <Button
            type="button"
            className="min-h-10 w-full sm:w-auto"
            disabled={!user || !contactId || !subject.trim()}
            onClick={() =>
              user &&
              contactId &&
              void insertContactLog({
                contact_id: contactId,
                kind: "note",
                subject: subject.trim(),
                body: body.trim() || null,
                created_by: user.id,
              })
                .then(() => {
                  toast.success("Logged");
                  setSubject("");
                  setBody("");
                  void load();
                })
                .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
            }
          >
            Save log
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/40 bg-muted/15 pb-2">
          <CardTitle className="text-base">Activity</CardTitle>
          <CardDescription>{rows.length} log{rows.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border/60 text-sm">
            {rows.length === 0 ? (
              <li className="px-3 py-8 text-center text-muted-foreground">No activity logged yet.</li>
            ) : (
              rows.map((r) => (
                <li key={r.id} className="px-3 py-3">
                  <p className="font-medium text-foreground">{r.subject}</p>
                  {r.body ? <p className="text-muted-foreground">{r.body}</p> : null}
                  <p className="mt-1 text-[10px] text-muted-foreground">{new Date(r.occurred_at).toLocaleString()}</p>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

