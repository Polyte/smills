import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database, QuoteRequestStatus, InvoiceDocStatus } from "../database.types";
import { isCrmDataAvailable, listContactsForBilling } from "../../../lib/crm/crmRepo";
import { useLocalSqliteCrm } from "../../../lib/crm/mode";
import {
  computeQuoteTotals,
  createInvoiceFromQuote,
  createQuoteWithLines,
  getCommercialDocumentSignedUrl,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { toast } from "sonner";
import { Download, ExternalLink, Eye, Loader2, Mail, Plus, RefreshCw, Send } from "lucide-react";
import { cn } from "../../components/ui/utils";
import { Textarea } from "../../components/ui/textarea";
import { canWriteCommercial } from "../../../lib/crm/roles";
import { BRAND_NAME } from "../../brand";
import {
  CommercialDocumentPreview,
  DEFAULT_SELLER_BLOCK,
  type CommercialSellerBlock,
} from "../components/quotes/CommercialDocumentPreview";

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

function parseLineForms(forms: LineForm[]): { description: string; qty: number; unit_price_zar: number }[] {
  return forms
    .filter((l) => l.description.trim())
    .map((l) => ({
      description: l.description.trim(),
      qty: Number(l.qty) || 0,
      unit_price_zar: Number(l.unit_price_zar) || 0,
    }));
}

function safePdfFilenameBase(label: string | undefined, fallback: string) {
  const s = (label ?? fallback).replace(/[/\\?%*:|"<>]+/g, "_").replace(/\s+/g, "_").slice(0, 120);
  return s || fallback;
}

const SELLER_STORAGE_KEY = "sm_crm_commercial_seller_v1";
const PAYMENT_STORAGE_KEY = "sm_crm_commercial_payment_notes_v1";

const WIZARD_STEPS = [
  { id: 1, label: "From & To" },
  { id: 2, label: "Document" },
  { id: 3, label: "Line items" },
  { id: 4, label: "Payment & send" },
] as const;

function loadSellerBlock(): CommercialSellerBlock {
  const base: CommercialSellerBlock = { ...DEFAULT_SELLER_BLOCK, name: BRAND_NAME };
  try {
    const raw = sessionStorage.getItem(SELLER_STORAGE_KEY);
    if (raw) return { ...base, ...JSON.parse(raw) as CommercialSellerBlock };
  } catch {
    /* ignore */
  }
  return base;
}

function loadPaymentNotes(): string {
  try {
    return sessionStorage.getItem(PAYMENT_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function QuotesPage() {
  const { user, profile, session } = useCrmAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightRequest = searchParams.get("request");

  const canWrite = canWriteCommercial(profile?.role);
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

  const [billingContacts, setBillingContacts] = useState<
    Awaited<ReturnType<typeof listContactsForBilling>>
  >([]);
  const [billContactSelect, setBillContactSelect] = useState<string>("__none__");
  const [billEmail, setBillEmail] = useState("");
  const [billCompany, setBillCompany] = useState("");
  const [billContactName, setBillContactName] = useState("");
  const [previewOpen, setPreviewOpen] = useState<"quote" | "invoice" | null>(null);
  const [emailDialog, setEmailDialog] = useState<"quote" | "invoice" | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [openingPdf, setOpeningPdf] = useState(false);

  const [sellerBlock, setSellerBlock] = useState<CommercialSellerBlock>(loadSellerBlock);
  const [paymentNotes, setPaymentNotes] = useState(loadPaymentNotes);
  const [wizardStep, setWizardStep] = useState<(typeof WIZARD_STEPS)[number]["id"]>(1);
  const [docEditorFocus, setDocEditorFocus] = useState<"quote" | "invoice">("quote");

  useEffect(() => {
    try {
      sessionStorage.setItem(SELLER_STORAGE_KEY, JSON.stringify(sellerBlock));
    } catch {
      /* ignore */
    }
  }, [sellerBlock]);

  useEffect(() => {
    try {
      sessionStorage.setItem(PAYMENT_STORAGE_KEY, paymentNotes);
    } catch {
      /* ignore */
    }
  }, [paymentNotes]);

  useEffect(() => {
    setDocEditorFocus("quote");
  }, [activeQuote?.id]);

  useEffect(() => {
    if (activeQuote && activeQuote.status !== "accepted") {
      setDocEditorFocus("quote");
    }
  }, [activeQuote?.status, activeQuote]);

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

  useEffect(() => {
    if (!isCrmDataAvailable() || !user) return;
    void listContactsForBilling()
      .then(setBillingContacts)
      .catch(() => setBillingContacts([]));
  }, [user]);

  useEffect(() => {
    if (!selected) return;
    if (activeInvoice) {
      setBillEmail(
        activeInvoice.customer_email_snapshot ||
          activeQuote?.customer_email_snapshot ||
          selected.email ||
          ""
      );
      setBillCompany(
        activeInvoice.customer_company_snapshot ||
          activeQuote?.customer_company_snapshot ||
          selected.company_name ||
          ""
      );
      setBillContactName(
        activeInvoice.customer_contact_snapshot ||
          activeQuote?.customer_contact_snapshot ||
          selected.contact_name ||
          ""
      );
    } else if (activeQuote) {
      setBillEmail(activeQuote.customer_email_snapshot || selected.email || "");
      setBillCompany(activeQuote.customer_company_snapshot || selected.company_name || "");
      setBillContactName(activeQuote.customer_contact_snapshot || selected.contact_name || "");
    } else {
      setBillEmail(selected.email);
      setBillCompany(selected.company_name);
      setBillContactName(selected.contact_name);
    }
    setBillContactSelect("__none__");
  }, [selected?.id, activeQuote?.id, activeInvoice?.id, selected, activeQuote, activeInvoice]);

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

  useEffect(() => {
    if (selected) setWizardStep(1);
  }, [selected?.id]);

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

  async function applyBillToQuote() {
    if (!activeQuote || !canWrite) return;
    const email = billEmail.trim();
    if (!email) {
      toast.error("Billing email is required");
      return;
    }
    try {
      await updateQuoteHeader(activeQuote.id, {
        customer_email_snapshot: email,
        customer_company_snapshot: billCompany.trim() || null,
        customer_contact_snapshot: billContactName.trim() || null,
      });
      toast.success("Quote bill-to updated");
      await loadQuotesForSelection(selected);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function applyBillToInvoice() {
    if (!activeInvoice || !canWrite) return;
    const email = billEmail.trim();
    if (!email) {
      toast.error("Billing email is required");
      return;
    }
    try {
      await updateInvoiceHeader(activeInvoice.id, {
        customer_email_snapshot: email,
        customer_company_snapshot: billCompany.trim() || null,
        customer_contact_snapshot: billContactName.trim() || null,
      });
      toast.success("Invoice bill-to updated");
      await loadQuotesForSelection(selected);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function openStoredPdf(kind: "quote" | "invoice") {
    const path = kind === "quote" ? activeQuote?.pdf_path : activeInvoice?.pdf_path;
    if (isLocalCrm) {
      toast.error("View PDF requires Supabase (storage bucket).");
      return;
    }
    if (!path?.trim()) {
      toast.error("No PDF yet. Email the document once to generate and store the PDF.");
      return;
    }
    setOpeningPdf(true);
    try {
      const url = await getCommercialDocumentSignedUrl(path);
      if (!url) {
        toast.error("Could not open PDF link");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setOpeningPdf(false);
    }
  }

  async function downloadStoredPdf(kind: "quote" | "invoice") {
    const path = kind === "quote" ? activeQuote?.pdf_path : activeInvoice?.pdf_path;
    const numberLabel =
      kind === "quote" ? activeQuote?.quote_number : activeInvoice?.invoice_number;
    if (isLocalCrm) {
      toast.error("Download requires Supabase (storage bucket).");
      return;
    }
    if (!path?.trim()) {
      toast.error("No PDF yet. Send the document by email once to generate and store the PDF.");
      return;
    }
    setOpeningPdf(true);
    try {
      const url = await getCommercialDocumentSignedUrl(path);
      if (!url) {
        toast.error("Could not get download link");
        return;
      }
      const res = await fetch(url);
      if (!res.ok) {
        toast.error("Could not download PDF");
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${safePdfFilenameBase(numberLabel, kind === "invoice" ? "invoice" : "quote")}.pdf`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setOpeningPdf(false);
    }
  }

  function openEmailDialog(kind: "quote" | "invoice") {
    const fallback =
      kind === "quote"
        ? activeQuote?.customer_email_snapshot || selected?.email || ""
        : activeInvoice?.customer_email_snapshot ||
          activeQuote?.customer_email_snapshot ||
          selected?.email ||
          "";
    setEmailTo((billEmail.trim() || fallback).trim());
    setEmailDialog(kind);
  }

  async function confirmSendEmail() {
    if (!emailDialog || !session?.access_token) return;
    const to = emailTo.trim();
    if (!to) {
      toast.error("Enter a recipient email");
      return;
    }
    const quoteId = activeQuote?.id;
    const invoiceId = activeInvoice?.id;
    if (emailDialog === "quote" && !quoteId) return;
    if (emailDialog === "invoice" && !invoiceId) return;
    setSending(true);
    try {
      const res = await invokeSendCommercialDocument(session.access_token, {
        type: emailDialog === "quote" ? "quote" : "invoice",
        id: emailDialog === "quote" ? quoteId! : invoiceId!,
        recipient_email: to,
      });
      if (!res.ok) {
        toast.error(res.error || "Send failed");
        return;
      }
      toast.success(emailDialog === "quote" ? "Quote emailed" : "Invoice emailed");
      setEmailDialog(null);
      void load();
      await loadQuotesForSelection(selected);
    } finally {
      setSending(false);
    }
  }

  const quotePreview = useMemo(() => {
    const parsed = parseLineForms(lines);
    const tax = Number(taxRate) || 0;
    const rows = parsed.map((l) => ({
      ...l,
      line_total_zar: Math.round(l.qty * l.unit_price_zar * 100) / 100,
    }));
    const totals = computeQuoteTotals(
      rows.map((r) => ({ qty: r.qty, unit_price_zar: r.unit_price_zar })),
      tax
    );
    return {
      rows,
      ...totals,
      tax,
      validUntil: validUntil.trim(),
      quoteNumber: quoteNumberOverride.trim() || activeQuote?.quote_number || "—",
    };
  }, [lines, taxRate, validUntil, quoteNumberOverride, activeQuote?.quote_number]);

  const invoicePreview = useMemo(() => {
    const parsed = parseLineForms(invLines);
    const tax = Number(invTaxRate) || 0;
    const rows = parsed.map((l) => ({
      ...l,
      line_total_zar: Math.round(l.qty * l.unit_price_zar * 100) / 100,
    }));
    const totals = computeQuoteTotals(
      rows.map((r) => ({ qty: r.qty, unit_price_zar: r.unit_price_zar })),
      tax
    );
    return {
      rows,
      ...totals,
      tax,
      dueDate: invDue.trim(),
      invoiceNumber:
        activeInvoice?.invoice_number ??
        (activeQuote?.status === "accepted" ? "Draft invoice" : "—"),
    };
  }, [invLines, invTaxRate, invDue, activeInvoice?.invoice_number, activeQuote?.status]);

  const previewVariant: "quote" | "invoice" = docEditorFocus === "invoice" ? "invoice" : "quote";

  const livePreviewBuyer = useMemo(
    () => ({
      company: billCompany,
      contactName: billContactName,
      email: billEmail,
    }),
    [billCompany, billContactName, billEmail]
  );

  const previewDateLabel = useMemo(() => {
    if (previewVariant === "invoice") {
      if (activeInvoice) {
        return `Issued ${new Date(activeInvoice.created_at).toLocaleDateString()}`;
      }
      return `Draft · ${new Date().toLocaleDateString()}`;
    }
    if (activeQuote) {
      return `Issued ${new Date(activeQuote.created_at).toLocaleDateString()}`;
    }
    return `Draft · ${new Date().toLocaleDateString()}`;
  }, [previewVariant, activeQuote, activeInvoice]);

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
    <div className="w-full max-w-none space-y-6">
      {isLocalCrm ? (
        <p className="text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-950 px-4 py-3 w-full">
          <strong>Local CRM (SQLite):</strong> quote requests, quotes, and invoices are stored in this browser.
          Automated PDF generation and email use Supabase Edge Functions—connect Supabase for that workflow, or copy
          details from here manually.
        </p>
      ) : null}

      <section className="w-full space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Incoming requests</h3>
        <div className="rounded-md border w-full overflow-x-auto">
          <Table className="w-full min-w-[520px]">
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
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        <div>
          <h2 className="text-xl font-display font-semibold">Quotes &amp; invoicing</h2>
          <p className="text-sm text-muted-foreground">
            Step-through quote &amp; invoice builder with live document preview (inspired by tools like{" "}
            <a
              href="https://invoify.vercel.app/"
              className="underline underline-offset-2 text-foreground/90 hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              Invoify
            </a>
            )—PDF email still uses your saved CRM snapshots.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void load()}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      <div className="w-full min-w-0 space-y-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select a request to build a quote or invoice.</p>
          ) : (
            <>
              {selectedSummary}

              <div className="rounded-lg border bg-muted/40 p-1.5 flex flex-wrap gap-1">
                {WIZARD_STEPS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setWizardStep(s.id)}
                    className={cn(
                      "rounded-md px-3 py-2 text-left text-xs font-medium transition-colors",
                      wizardStep === s.id
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:bg-background"
                    )}
                  >
                    <span className="opacity-80 tabular-nums">{s.id}.</span> {s.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Step-through quote and invoice builder with a live preview. PDFs from email use saved lines and bill-to;
                payment notes (step 4) show here only until the PDF template includes them.
              </p>

              <div className="grid w-full gap-6 lg:grid-cols-2 lg:items-start">
                <div className="space-y-4 min-w-0">
              {wizardStep === 1 ? (
              <div className="rounded-lg border bg-card p-4 space-y-4 text-sm print:hidden">
                <div>
                  <h3 className="text-sm font-semibold mb-3">Bill from</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Business name</Label>
                      <Input
                        value={sellerBlock.name}
                        disabled={!canWrite}
                        onChange={(e) => setSellerBlock((b) => ({ ...b, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Address</Label>
                      <Textarea
                        rows={2}
                        value={sellerBlock.address}
                        disabled={!canWrite}
                        onChange={(e) => setSellerBlock((b) => ({ ...b, address: e.target.value }))}
                        className="min-h-[60px] resize-y"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">City</Label>
                      <Input
                        value={sellerBlock.city}
                        disabled={!canWrite}
                        onChange={(e) => setSellerBlock((b) => ({ ...b, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Postal / ZIP</Label>
                      <Input
                        value={sellerBlock.zip}
                        disabled={!canWrite}
                        onChange={(e) => setSellerBlock((b) => ({ ...b, zip: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Country</Label>
                      <Input
                        value={sellerBlock.country}
                        disabled={!canWrite}
                        onChange={(e) => setSellerBlock((b) => ({ ...b, country: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input
                        type="email"
                        value={sellerBlock.email}
                        disabled={!canWrite}
                        onChange={(e) => setSellerBlock((b) => ({ ...b, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone</Label>
                      <Input
                        value={sellerBlock.phone}
                        disabled={!canWrite}
                        onChange={(e) => setSellerBlock((b) => ({ ...b, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-sm font-semibold">Bill to (customer)</h3>
                <p className="text-xs text-muted-foreground">
                  Choose a CRM contact or edit fields, then apply to the active quote or invoice. PDF text uses saved
                  snapshots; the email dialog can override delivery address only.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Contact</Label>
                    <Select
                      value={billContactSelect}
                      disabled={!canWrite}
                      onValueChange={(v) => {
                        setBillContactSelect(v);
                        if (v === "__none__") return;
                        const c = billingContacts.find((x) => x.id === v);
                        if (c) {
                          setBillEmail(c.email);
                          setBillCompany(c.company_name);
                          setBillContactName(c.contact_name || "");
                        }
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select contact…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Type manually / keep current</SelectItem>
                        {billingContacts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.company_name} — {c.contact_name || c.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Company</Label>
                    <Input value={billCompany} onChange={(e) => setBillCompany(e.target.value)} disabled={!canWrite} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Contact name</Label>
                    <Input
                      value={billContactName}
                      onChange={(e) => setBillContactName(e.target.value)}
                      disabled={!canWrite}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={billEmail}
                      onChange={(e) => setBillEmail(e.target.value)}
                      disabled={!canWrite}
                    />
                  </div>
                </div>
                {canWrite ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" size="sm" variant="secondary" disabled={!activeQuote} onClick={() => void applyBillToQuote()}>
                      Apply to quote
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={!activeInvoice}
                      onClick={() => void applyBillToInvoice()}
                    >
                      Apply to invoice
                    </Button>
                  </div>
                ) : null}
                </div>
              </div>
              ) : null}

              {wizardStep >= 2 ? (
              <>
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
                          setDocEditorFocus("quote");
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
                {activeQuote && !canWrite ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => setPreviewOpen("quote")}>
                      <Eye className="size-4" />
                      Full view
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      disabled={openingPdf || !activeQuote.pdf_path}
                      onClick={() => void openStoredPdf("quote")}
                    >
                      <ExternalLink className="size-4" />
                      View PDF
                    </Button>
                  </div>
                ) : null}
              </div>

              {activeQuote?.status === "accepted" ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card/80 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">Live preview &amp; editor focus</span>
                  <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={docEditorFocus === "quote" ? "default" : "ghost"}
                      className="h-8 px-3"
                      onClick={() => {
                        setDocEditorFocus("quote");
                        setWizardStep(2);
                      }}
                    >
                      Quote
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={docEditorFocus === "invoice" ? "default" : "ghost"}
                      className="h-8 px-3"
                      onClick={() => {
                        setDocEditorFocus("invoice");
                        setWizardStep(2);
                      }}
                    >
                      Invoice
                    </Button>
                  </div>
                </div>
              ) : null}

              {canWrite ? (
                docEditorFocus === "quote" ? (
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <h3 className="text-sm font-semibold">
                    {activeQuote ? `Edit quote ${activeQuote.quote_number}` : "Create first quote"}
                  </h3>
                  {wizardStep === 2 ? (
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
                  ) : null}
                  {wizardStep === 3 ? (
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
                  ) : null}
                  {wizardStep === 4 ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Payment &amp; notes (preview only)</Label>
                      <Textarea
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        rows={4}
                        placeholder="Bank details, terms, reference…"
                        className="resize-y min-h-[88px]"
                      />
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
                    {activeQuote ? (
                      <>
                        <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => setPreviewOpen("quote")}>
                          <Eye className="size-4" />
                          Full view
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          disabled={openingPdf || !activeQuote.pdf_path}
                          onClick={() => void openStoredPdf("quote")}
                        >
                          <ExternalLink className="size-4" />
                          View PDF
                        </Button>
                      </>
                    ) : null}
                    {activeQuote && activeQuote.status === "draft" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={sending}
                        className="gap-2"
                        onClick={() => openEmailDialog("quote")}
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
                  </>
                  ) : null}
                </div>
                ) : (
                  <p className="text-xs text-muted-foreground rounded-lg border border-dashed px-3 py-2">
                    Invoice step: switch the <strong>Invoice</strong> tab above to edit tax invoice lines and delivery.
                  </p>
                )
              ) : (
                <p className="text-xs text-muted-foreground">
                  Read-only: sign in with a role that can edit quotes (sales, quality, production manager, or admin).
                </p>
              )}

              {activeQuote && activeQuote.status === "accepted" && canWrite && docEditorFocus === "invoice" ? (
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="text-sm font-semibold">Tax invoice</h3>
                  {invoices.length === 0 ? (
                    <>
                      {wizardStep === 2 ? (
                        <>
                          <p className="text-xs text-muted-foreground">Details for the first invoice on this quote.</p>
                          <div className="space-y-2">
                            <Label className="text-xs">Due date</Label>
                            <Input type="date" value={invDue} onChange={(e) => setInvDue(e.target.value)} />
                            <Label className="text-xs">Tax rate</Label>
                            <Input value={invTaxRate} onChange={(e) => setInvTaxRate(e.target.value)} />
                          </div>
                        </>
                      ) : null}
                      {wizardStep === 3 ? (
                        <div className="space-y-2">
                          <Label className="text-xs">Lines</Label>
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
                      ) : null}
                      {wizardStep === 4 ? (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs">Payment &amp; notes (preview only)</Label>
                            <Textarea
                              value={paymentNotes}
                              onChange={(e) => setPaymentNotes(e.target.value)}
                              rows={3}
                              className="resize-y min-h-[72px]"
                            />
                          </div>
                          <Button type="button" disabled={creatingInvoice} onClick={() => void createInvoice()}>
                            {creatingInvoice ? <Loader2 className="size-4 animate-spin" /> : "Create invoice"}
                          </Button>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {wizardStep === 2 ? (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {invoices.map((inv) => (
                            <Button
                              key={inv.id}
                              size="sm"
                              variant={activeInvoice?.id === inv.id ? "default" : "outline"}
                              onClick={() => {
                                setActiveInvoice(inv);
                                setDocEditorFocus("invoice");
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
                      ) : null}
                      {activeInvoice && wizardStep === 2 ? (
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
                      ) : null}
                      {activeInvoice && wizardStep === 2 ? (
                        <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
                          <div className="space-y-1">
                            <Label className="text-xs">Due date</Label>
                            <Input type="date" value={invDue} onChange={(e) => setInvDue(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Tax rate</Label>
                            <Input value={invTaxRate} onChange={(e) => setInvTaxRate(e.target.value)} />
                          </div>
                        </div>
                      ) : null}
                      {activeInvoice && wizardStep === 3 ? (
                        <div className="space-y-2">
                          <Label className="text-xs">Lines</Label>
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
                      ) : null}
                      {activeInvoice && wizardStep === 4 ? (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs">Payment &amp; notes (preview only)</Label>
                            <Textarea
                              value={paymentNotes}
                              onChange={(e) => setPaymentNotes(e.target.value)}
                              rows={3}
                              className="resize-y min-h-[72px]"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => void saveInvoiceLines()}>
                              Save invoice lines
                            </Button>
                            <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => setPreviewOpen("invoice")}>
                              <Eye className="size-4" />
                              Full view
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              disabled={openingPdf || !activeInvoice.pdf_path}
                              onClick={() => void openStoredPdf("invoice")}
                            >
                              <ExternalLink className="size-4" />
                              View PDF
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              disabled={openingPdf || !activeInvoice.pdf_path}
                              onClick={() => void downloadStoredPdf("invoice")}
                            >
                              <Download className="size-4" />
                              Download invoice
                            </Button>
                            {activeInvoice.status === "draft" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="gap-2"
                                disabled={sending}
                                onClick={() => openEmailDialog("invoice")}
                              >
                                <Send className="size-4" />
                                Send invoice
                              </Button>
                            ) : null}
                          </div>
                        </>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
              </>
              ) : null}
                </div>
                <div className="space-y-2 min-w-0 lg:sticky lg:top-20 lg:self-start print:hidden">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live preview</p>
                  <CommercialDocumentPreview
                    variant={previewVariant}
                    seller={sellerBlock}
                    buyer={livePreviewBuyer}
                    documentNumber={previewVariant === "quote" ? quotePreview.quoteNumber : invoicePreview.invoiceNumber}
                    documentDateLabel={previewDateLabel}
                    validUntil={quotePreview.validUntil}
                    dueDate={invoicePreview.dueDate}
                    rows={previewVariant === "quote" ? quotePreview.rows : invoicePreview.rows}
                    subtotal_zar={previewVariant === "quote" ? quotePreview.subtotal_zar : invoicePreview.subtotal_zar}
                    tax_rate={previewVariant === "quote" ? quotePreview.tax : invoicePreview.tax}
                    tax_zar={previewVariant === "quote" ? quotePreview.tax_zar : invoicePreview.tax_zar}
                    total_zar={previewVariant === "quote" ? quotePreview.total_zar : invoicePreview.total_zar}
                    paymentNotes={paymentNotes}
                    density="compact"
                  />
                </div>
              </div>
            </>
          )}
      </div>

      <Dialog open={previewOpen !== null} onOpenChange={(open) => !open && setPreviewOpen(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-muted/40">
          <DialogHeader>
            <DialogTitle>{previewOpen === "invoice" ? "Invoice preview" : "Quote preview"}</DialogTitle>
            <DialogDescription className="sr-only">
              Read-only preview of bill-to, lines, and totals as shown in the editor.
            </DialogDescription>
          </DialogHeader>
          {previewOpen === "quote" ? (
            <CommercialDocumentPreview
              variant="quote"
              seller={sellerBlock}
              buyer={livePreviewBuyer}
              documentNumber={quotePreview.quoteNumber}
              documentDateLabel={previewDateLabel}
              validUntil={quotePreview.validUntil}
              rows={quotePreview.rows}
              subtotal_zar={quotePreview.subtotal_zar}
              tax_rate={quotePreview.tax}
              tax_zar={quotePreview.tax_zar}
              total_zar={quotePreview.total_zar}
              paymentNotes={paymentNotes}
              density="comfortable"
            />
          ) : previewOpen === "invoice" ? (
            <CommercialDocumentPreview
              variant="invoice"
              seller={sellerBlock}
              buyer={livePreviewBuyer}
              documentNumber={invoicePreview.invoiceNumber}
              documentDateLabel={previewDateLabel}
              dueDate={invoicePreview.dueDate}
              rows={invoicePreview.rows}
              subtotal_zar={invoicePreview.subtotal_zar}
              tax_rate={invoicePreview.tax}
              tax_zar={invoicePreview.tax_zar}
              total_zar={invoicePreview.total_zar}
              paymentNotes={paymentNotes}
              density="comfortable"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={emailDialog !== null} onOpenChange={(open) => !open && setEmailDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{emailDialog === "invoice" ? "Send invoice" : "Email quote PDF"}</DialogTitle>
            <DialogDescription>
              Bill-to on the PDF follows saved quote/invoice snapshots. This address is used for delivery only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="email-doc-to">To</Label>
            <Input
              id="email-doc-to"
              type="email"
              autoComplete="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setEmailDialog(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={sending} onClick={() => void confirmSendEmail()}>
              {sending ? <Loader2 className="size-4 animate-spin" /> : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
