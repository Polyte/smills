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
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { toast } from "sonner";
import { Paperclip, Trash2 } from "lucide-react";

export function ContactLogsPage() {
  const { contactId } = useParams();
  const { user, profile } = useCrmAuth();
  const [rows, setRows] = useState<ContactLogRow[]>([]);
  const [docs, setDocs] = useState<ContactDocumentRow[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const canDeleteDocs = isOpsAdmin(profile?.role);

  const load = useCallback(async () => {
    if (!crmUsesSupabase() || !contactId) return;
    try {
      const [logs, d] = await Promise.all([listContactLogs(contactId), listContactDocuments(contactId)]);
      setRows(logs);
      setDocs(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
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

  return (
    <div className="space-y-4 max-w-2xl">
      <Link to="/crm/contacts" className="text-xs font-medium text-primary hover:underline">
        ← Contacts
      </Link>
      <h1 className="text-2xl font-display font-bold tracking-tight">Contact activity</h1>
      <p className="text-xs text-muted-foreground">
        Notes and calls are logged below. Upload contracts, MSDS, or supplier specs — stored privately; team members
        open files via a short-lived signed link.
      </p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="size-4" />
            Documents
          </CardTitle>
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
            disabled={!user}
            onClick={() => fileRef.current?.click()}
          >
            Upload file
          </Button>
          <ul className="divide-y rounded-md border text-sm max-h-48 overflow-y-auto">
            {docs.length === 0 ? (
              <li className="px-3 py-4 text-muted-foreground text-center">No documents yet.</li>
            ) : (
              docs.map((d) => (
                <li key={d.id} className="px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    className="text-left font-medium text-primary hover:underline truncate max-w-[220px]"
                    onClick={() => void openDoc(d)}
                  >
                    {d.file_name}
                  </button>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(d.created_at).toLocaleString()}
                  </span>
                  {canDeleteDocs ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 size-8 text-destructive"
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Log entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="Details" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
          <Button
            type="button"
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
      <ul className="divide-y rounded-lg border text-sm">
        {rows.map((r) => (
          <li key={r.id} className="px-3 py-2">
            <p className="font-medium">{r.subject}</p>
            {r.body ? <p className="text-muted-foreground">{r.body}</p> : null}
            <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.occurred_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
