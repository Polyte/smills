import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database, QuoteRequestStatus, InvoiceDocStatus } from "../database.types";
import { isCrmDataAvailable } from "../../../lib/crm/crmRepo";
import { useLocalSqliteCrm } from "../../../lib/crm/mode";
import {
  createInvoiceFromQuote,
  createQuoteWithLines,
  invokeSendCommercialDocument,
  listInvoiceLines,
  listInvoicesForQuote,
  listQuoteLines,
  listQuoteRequests,
  listQuotesForRequest,
  replaceInvoiceLines,
  replaceQuoteLines,
  updateInvoiceHeader,
  updateQuoteHeader,
  updateQuoteRequest,
} from "../../../lib/crm/quotesRepo";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { Loader2, Mail, Plus, RefreshCw } from "lucide-react";
import { cn } from "../../components/ui/utils";

type QuoteRequestRow = Database["public"]["Tables"]["quote_requests"]["Row"];
type QuoteRow = Database["public"]["Tables"]["quotes"]["Row"];
type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];

const REQUEST_STATUSES: QuoteRequestStatus[] = [
  "submitted",
  "reviewing",
  "quoted",
  "accepted",
  "declined",
  "invoiced",
  "paid",
  "cancelled",
];

const INVOICE_STATUSES: InvoiceDocStatus[] = [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "void",
];

type LineForm = { description: string; qty: string; unit_price_zar: string };

const emptyLine = (): LineForm => ({ description: "", qty: "1", unit_price_zar: "0" });

export function QuotesPage() {
  const { user, profile, session } = useCrmAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightRequest = searchParams.get("request");

  const canWrite =
    profile?.role === "admin" ||
    profile?.role === "production_manager" ||
    profile?.role === "sales" ||
    profile?.role === "quality_officer";
  const isLocalCrm = useLocalSqliteCrm();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<QuoteRequestRow[]>([]);
  const [selected, setSelected] = useState<QuoteRequestRow | null>(null);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [activeQuote, setActiveQuote] = useState<QuoteRow | null>(null);
  const [lines, setLines] = useState<LineForm[]>([emptyLine()]);
  const [taxRate, setTaxRate] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [quoteNumberOverride, setQuoteNumberOverride] = useState("");
  const [savingLines, setSavingLines] = useState(false);
  const [sending, setSending] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [activeInvoice, setActiveInvoice] = useState<InvoiceRow | null>(null);
  const [invLines, setInvLines] = useState<LineForm[]>([emptyLine()]);
  const [invTaxRate, setInvTaxRate] = useState("0");
  const [invDue, setInvDue] = useState("");
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      setRequests([]);
      return;
    }
    setLoading(true);
    try {
      const r = await listQuoteRequests();
      setRequests(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load quote requests");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadQuotesForSelection = useCallback(async (req: QuoteRequestRow | null) => {
    if (!req || !user) {
      setQuotes([]);
      setActiveQuote(null);
      setInvoices([]);
      setActiveInvoice(null);
      return;
    }
    try {
      const q = await listQuotesForRequest(req.id);
      setQuotes(q);
      const pick = q[0] ?? null;
      setActiveQuote(pick);
      if (pick) {
        const ql = await listQuoteLines(pick.id);
        setLines(
          ql.length
            ? ql.map((l) => ({
               	description: l.description,
               	qty: String(l.qty),
               	unit_price_zar: String(l.unit_price_zar),
              }))
            : [emptyLine()]
        );
        setTaxRate(String(pick.tax_rate ?? 0));
        setValidUntil(pick.valid_until ? pick.valid_until.slice(0, 10) : "");
        setQuoteNumberOverride(pick.quote_number);
        const inv = await listInvoicesForQuote(pick.id);
        setInvoices(inv);
        const invPick = inv[0] ?? null;
        setActiveInvoice(invPick);
        if (invPick) {
          const il = await listInvoiceLines(invPick.id);
          setInvLines(
            il.length
              ? il.map((l) => ({
                 	description: l.description,
                 	qty: String(l.qty),
                 	unit_price_zar: String(l.unit_price_zar),
                }))
              : [emptyLine()]
          );
          setInvTaxRate(String(invPick.tax_rate ?? 0));
          setInvDue(invPick.due_date ? invPick.due_date.slice(0, 10) : "");
        } else {
          setInvLines([emptyLine()]);
          setInvTaxRate("0");
          setInvDue("");
        }
      } else {
        setLines([emptyLine()]);
        setTaxRate("0");
        setValidUntil("");
        setQuoteNumberOverride("");
        setInvoices([]);
        setActiveInvoice(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load quotes");
    }
  }, [user]);

  useEffect(() => {
    void loadQuotesForSelection(selected);
  }, [selected, loadQuotesForSelection]);

  useEffect(() => {
    if (!highlightRequest || !requests.length) return;
    const found = requests.find((x) => x.id === highlightRequest);
    if (found) setSelected(found);
  }, [highlightRequest, requests]);

  async function patchRequestStatus(status: QuoteRequestStatus) {
    if (!selected || !canWrite) return;
    try {
      await updateQuoteRequest(selected.id, { status });
      toast.success("Request updated");
      void load();
      setSelected((s) => (s ? { ...s, status } : null));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function createNewQuote() {
    if (!selected || !user || !canWrite) return;
    const parsed = lines
      .filter((l) => l.description.trim())
      .map((l) => ({
        description: l.description.trim(),
        qty: Number(l.qty) || 0,
        unit_price_zar: Number(l.unit_price_zar) || 0,
      }));
    if (parsed.length === 0) {
      toast.error("Add at least one line with a description");
      return;
    }
    try {
      const id = await createQuoteWithLines(user.id, selected, {
        quote_number: quoteNumberOverride.trim() || undefined,
        valid_until: validUntil.trim() || null,
        tax_rate: Number(taxRate) || 0,
        lines: parsed,
      });
      toast.success("Quote created");
      void load();
      await loadQuotesForSelection(selected);
      const q = await listQuotesForRequest(selected.id);
      const created = q.find((x) => x.id === id);
      if (created) setActiveQuote(created);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create quote");
    }
  }

  async function saveActiveQuoteLines() {
    if (!activeQuote || !canWrite) return;
    const parsed = lines
      .filter((l) => l.description.trim())
      .map((l) => ({
        description: l.description.trim(),
        qty: Number(l.qty) || 0,
        unit_price_zar: Number(l.unit_price_zar) || 0,
      }));
    setSavingLines(true);
    try {
      await replaceQuoteLines(activeQuote.id, parsed, Number(taxRate) || 0);
      await updateQuoteHeader(activeQuote.id, {
        valid_until: validUntil.trim() || null,
        quote_number: quoteNumberOverride.trim() || activeQuote.quote_number,
      });
      toast.success("Quote saved");
      void load();
      await loadQuotesForSelection(selected);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingLines(false);
    }
  }

  async function sendQuoteEmail() {
    if (!activeQuote || !session?.access_token) return;
    setSending(true);
    try {
      const res = await invokeSendCommercialDocument(session.access_token, {
        type: "quote",
        id: activeQuote.id,
      });
      if (!res.ok) {
        toast.error(res.error || "Send failed");
        return;
      }
      toast.success("Quote emailed to customer");
      void load();
      await loadQuotesForSelection(selected);
    } finally {
      setSending(false);
    }
  }

  async function markQuoteAccepted() {
    if (!activeQuote || !selected || !canWrite) return;
    try {
      await updateQuoteHeader(activeQuote.id, { status: "accepted" });
      await updateQuoteRequest(selected.id, { status: "accepted" });
      toast.success("Marked as accepted");
      void load();
      await loadQuotesForSelection(selected);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function createInvoice() {
    if (!activeQuote || !selected || !user || !canWrite) return;
    if (activeQuote.status !== "accepted") {
      toast.error("Accept the quote before creating an invoice");
      return;
    }
    const parsed = invLines
      .filter((l) => l.description.trim())
      .map((l) => ({
        description: l.description.trim(),
        qty: Number(l.qty) || 0,
        unit_price_zar: Number(l.unit_price_zar) || 0,
      }));
    if (parsed.length === 0) {
      toast.error("Add invoice lines");
      return;
    }
    setCreatingInvoice(true);
    try {
      await createInvoiceFromQuote(user.id, activeQuote, selected, {
        due_date: invDue.trim() || null,
        tax_rate: Number(invTaxRate) || 0,
        lines: parsed,
      });
      toast.success("Invoice created");
      await loadQuotesForSelection(selected);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create invoice");
    } finally {
      setCreatingInvoice(false);
    }
  }

  async function saveInvoiceLines() {
    if (!activeInvoice || !canWrite) return;
    const parsed = invLines
      .filter((l) => l.description.trim())
      .map((l) => ({
        description: l.description.trim(),
        qty: Number(l.qty) || 0,
        unit_price_zar: Number(l.unit_price_zar) || 0,
      }));
    try {
      await replaceInvoiceLines(activeInvoice.id, parsed, Number(invTaxRate) || 0);
      await updateInvoiceHeader(activeInvoice.id, { due_date: invDue.trim() || null });
      toast.success("Invoice saved");
      await loadQuotesForSelection(selected);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function sendInvoiceEmail() {
    if (!activeInvoice || !session?.access_token) return;
    setSending(true);
    try {
      const res = await invokeSendCommercialDocument(session.access_token, {
        type: "invoice",
        id: activeInvoice.id,
      });
      if (!res.ok) {
        toast.error(res.error || "Send failed");
        return;
      }
      toast.success("Invoice emailed");
      void load();
      await loadQuotesForSelection(selected);
    } finally {
      setSending(false);
    }
  }

  async function patchInvoiceStatus(status: InvoiceDocStatus) {
    if (!activeInvoice || !canWrite) return;
    try {
      await updateInvoiceHeader(activeInvoice.id, { status });
      if (status === "paid" && selected) {
        await updateQuoteRequest(selected.id, { status: "paid" });
      }
      toast.success("Invoice updated");
      await loadQuotesForSelection(selected);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  const selectedSummary = useMemo(() => {
    if (!selected) return null;
    return (
      <div className="space-y-3 rounded-lg border bg-card p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold">Request</span>
          <Badge variant="outline">{selected.status}</Badge>
        </div>
        <p>
          <span className="text-muted-foreground">Product:</span> {selected.product_label}
        </p>
        <p>
          <span className="text-muted-foreground">From:</span> {selected.contact_name} — {selected.company_name}
        </p>
        <p>
          <span className="text-muted-foreground">Email:</span> {selected.email}
        </p>
        <p>
          <span className="text-muted-foreground">Phone:</span> {selected.phone}
        </p>
        {selected.message ? (
          <p>
            <span className="text-muted-foreground">Message:</span> {selected.message}
          </p>
        ) : null}
        {canWrite ? (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-muted-foreground text-xs">Request status</span>
            <Select value={selected.status} onValueChange={(v) => void patchRequestStatus(v as QuoteRequestStatus)}>
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
    );
  }, [selected, canWrite]);

  if (!isCrmDataAvailable() || !user) {
    return <p className="text-sm text-muted-foreground">Sign in to view quotes.</p>;
  }

  return (
    <div className="space-y-6">
      {isLocalCrm ? (
        <p className="text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-950 px-4 py-3 max-w-3xl">
          <strong>Local CRM (SQLite):</strong> quote requests, quotes, and invoices are stored in this browser.
          Automated PDF generation and email use Supabase Edge Functions—connect Supabase for that workflow, or copy
          details from here manually.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-semibold">Quotes &amp; invoicing</h2>
          <p className="text-sm text-muted-foreground">
            Website quote requests, formal quotes (PDF + email), and tax invoices.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void load()}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Incoming requests</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      <Loader2 className="inline size-4 animate-spin mr-2" />
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No requests yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((r) => (
                    <TableRow
                      key={r.id}
                      className={cn("cursor-pointer", selected?.id === r.id && "bg-muted/60")}
                      onClick={() => {
                        setSelected(r);
                        setSearchParams({ request: r.id });
                      }}
                    >
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-sm">{r.product_label}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal capitalize">
                          {r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select a request to build a quote or invoice.</p>
          ) : (
            <>
              {selectedSummary}

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Quotes on this request</h3>
                {quotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No formal quote yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {quotes.map((q) => (
                      <Button
                        key={q.id}
                        type="button"
                        size="sm"
                        variant={activeQuote?.id === q.id ? "default" : "outline"}
                        onClick={() => {
                          setActiveQuote(q);
                          void (async () => {
                            const ql = await listQuoteLines(q.id);
                            setLines(
                              ql.length
                                ? ql.map((l) => ({
                                    description: l.description,
                                    qty: String(l.qty),
                                    unit_price_zar: String(l.unit_price_zar),
                                  }))
                                : [emptyLine()]
                            );
                            setTaxRate(String(q.tax_rate ?? 0));
                            setValidUntil(q.valid_until ? q.valid_until.slice(0, 10) : "");
                            setQuoteNumberOverride(q.quote_number);
                            const inv = await listInvoicesForQuote(q.id);
                            setInvoices(inv);
                            setActiveInvoice(inv[0] ?? null);
                          })();
                        }}
                      >
                        {q.quote_number} ({q.status})
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {canWrite ? (
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <h3 className="text-sm font-semibold">
                    {activeQuote ? `Edit quote ${activeQuote.quote_number}` : "Create first quote"}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Quote #</Label>
                      <Input
                        value={quoteNumberOverride}
                        onChange={(e) => setQuoteNumberOverride(e.target.value)}
                        placeholder="Auto if empty"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valid until</Label>
                      <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tax rate (e.g. 0.15 for VAT)</Label>
                      <Input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} inputMode="decimal" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Lines</Label>
                    {lines.map((line, idx) => (
                      <div key={idx} className="grid gap-2 sm:grid-cols-12 items-end">
                        <Input
                          className="sm:col-span-6"
                          placeholder="Description"
                          value={line.description}
                          onChange={(e) => {
                            const next = [...lines];
                            next[idx] = { ...line, description: e.target.value };
                            setLines(next);
                          }}
                        />
                        <Input
                          className="sm:col-span-2"
                          placeholder="Qty"
                          value={line.qty}
                          onChange={(e) => {
                            const next = [...lines];
                            next[idx] = { ...line, qty: e.target.value };
                            setLines(next);
                          }}
                        />
                        <Input
                          className="sm:col-span-3"
                          placeholder="Unit ZAR"
                          value={line.unit_price_zar}
                          onChange={(e) => {
                            const next = [...lines];
                            next[idx] = { ...line, unit_price_zar: e.target.value };
                            setLines(next);
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="sm:col-span-1"
                          onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                          disabled={lines.length <= 1}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, emptyLine()])}>
                      <Plus className="size-4 mr-1" /> Line
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeQuote ? (
                      <Button type="button" size="sm" disabled={savingLines} onClick={() => void saveActiveQuoteLines()}>
                        {savingLines ? <Loader2 className="size-4 animate-spin" /> : "Save quote"}
                      </Button>
                    ) : (
                      <Button type="button" size="sm" onClick={() => void createNewQuote()}>
                        Create quote
                      </Button>
                    )}
                    {activeQuote && activeQuote.status === "draft" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={sending}
                        className="gap-2"
                        onClick={() => void sendQuoteEmail()}
                      >
                        <Mail className="size-4" />
                        Email PDF
                      </Button>
                    ) : null}
                    {activeQuote && (activeQuote.status === "sent" || activeQuote.status === "draft") ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => void markQuoteAccepted()}>
                        Mark accepted
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Read-only: sign in with a role that can edit quotes (sales, quality, production manager, or admin).
                </p>
              )}

              {activeQuote && activeQuote.status === "accepted" && canWrite ? (
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="text-sm font-semibold">Invoice</h3>
                  {invoices.length === 0 ? (
                    <>
                      <p className="text-xs text-muted-foreground">Create an invoice from this accepted quote.</p>
                      <div className="space-y-2">
                        <Label className="text-xs">Due date</Label>
                        <Input type="date" value={invDue} onChange={(e) => setInvDue(e.target.value)} />
                        <Label className="text-xs">Tax rate</Label>
                        <Input value={invTaxRate} onChange={(e) => setInvTaxRate(e.target.value)} />
                        {invLines.map((line, idx) => (
                          <div key={idx} className="grid gap-2 sm:grid-cols-12 items-end">
                            <Input
                              className="sm:col-span-6"
                              placeholder="Description"
                              value={line.description}
                              onChange={(e) => {
                                const next = [...invLines];
                                next[idx] = { ...line, description: e.target.value };
                                setInvLines(next);
                              }}
                            />
                            <Input
                              className="sm:col-span-2"
                              value={line.qty}
                              onChange={(e) => {
                                const next = [...invLines];
                                next[idx] = { ...line, qty: e.target.value };
                                setInvLines(next);
                              }}
                            />
                            <Input
                              className="sm:col-span-3"
                              value={line.unit_price_zar}
                              onChange={(e) => {
                                const next = [...invLines];
                                next[idx] = { ...line, unit_price_zar: e.target.value };
                                setInvLines(next);
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="sm:col-span-1"
                              onClick={() => setInvLines(invLines.filter((_, i) => i !== idx))}
                              disabled={invLines.length <= 1}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => setInvLines([...invLines, emptyLine()])}>
                          <Plus className="size-4 mr-1" /> Line
                        </Button>
                      </div>
                      <Button type="button" disabled={creatingInvoice} onClick={() => void createInvoice()}>
                        {creatingInvoice ? <Loader2 className="size-4 animate-spin" /> : "Create invoice"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {invoices.map((inv) => (
                          <Button
                            key={inv.id}
                            size="sm"
                            variant={activeInvoice?.id === inv.id ? "default" : "outline"}
                            onClick={() => {
                              setActiveInvoice(inv);
                              void (async () => {
                                const il = await listInvoiceLines(inv.id);
                                setInvLines(
                                  il.length
                                    ? il.map((l) => ({
                                        description: l.description,
                                        qty: String(l.qty),
                                        unit_price_zar: String(l.unit_price_zar),
                                      }))
                                    : [emptyLine()]
                                );
                                setInvTaxRate(String(inv.tax_rate ?? 0));
                                setInvDue(inv.due_date ? inv.due_date.slice(0, 10) : "");
                              })();
                            }}
                          >
                            {inv.invoice_number} ({inv.status})
                          </Button>
                        ))}
                      </div>
                      {activeInvoice ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs text-muted-foreground">Status</span>
                            <Select
                              value={activeInvoice.status}
                              onValueChange={(v) => void patchInvoiceStatus(v as InvoiceDocStatus)}
                            >
                              <SelectTrigger className="h-8 w-[200px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {INVOICE_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button type="button" size="sm" variant="outline" onClick={() => void saveInvoiceLines()}>
                            Save invoice lines
                          </Button>
                          {activeInvoice.status === "draft" ? (
                            <Button
                              type="button"
                              size="sm"
                              className="gap-2 ml-2"
                              disabled={sending}
                              onClick={() => void sendInvoiceEmail()}
                            >
                              <Mail className="size-4" />
                              Email invoice PDF
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
