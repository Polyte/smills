import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb, type PDFPage } from "npm:pdf-lib@1.17.1";

type PdfDoc = Awaited<ReturnType<typeof PDFDocument.create>>;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMPANY = "Standerton Mills (Pty) Ltd";
const COMPANY_LINE2 = "Standerton, Mpumalanga, South Africa";

let _logoFile: Uint8Array | null | undefined;

async function loadBrandLogoBytes(): Promise<Uint8Array | null> {
  if (_logoFile !== undefined) return _logoFile;
  try {
    _logoFile = await Deno.readFile(new URL("./brand-logo.png", import.meta.url));
  } catch {
    try {
      _logoFile = await Deno.readFile("./brand-logo.png");
    } catch {
      _logoFile = null;
    }
  }
  return _logoFile;
}

async function drawBrandLogoOnPage(
  pdf: PdfDoc,
  page: PDFPage,
  left: number,
  yTop: number,
): Promise<number> {
  const bytes = await loadBrandLogoBytes();
  if (!bytes?.length) return yTop;
  try {
    const logo = await pdf.embedPng(bytes);
    const logoH = 40;
    const scale = logoH / logo.height;
    const logoW = logo.width * scale;
    page.drawImage(logo, { x: left, y: yTop - logoH, width: logoW, height: logoH });
    return yTop - logoH - 14;
  } catch {
    return yTop;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, [...bytes.subarray(i, i + chunk)] as number[]);
  }
  return btoa(bin);
}

async function buildQuotePdf(opts: {
  quoteNumber: string;
  dateStr: string;
  validUntil: string | null;
  billTo: { company: string; contact: string; email: string };
  lines: { description: string; qty: string; unit: string; lineTotal: string }[];
  subtotal: string;
  tax: string;
  total: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const left = 50;
  let y = 800;
  y = await drawBrandLogoOnPage(pdf, page, left, y);
  const draw = (text: string, opts2: { bold?: boolean; size?: number } = {}) => {
    const f = opts2.bold ? fontBold : font;
    const size = opts2.size ?? 10;
    page.drawText(text, { x: left, y, size, font: f, color: rgb(0.1, 0.1, 0.12) });
    y -= size + 4;
  };

  draw("QUOTATION", { bold: true, size: 18 });
  y -= 6;
  draw(COMPANY, { bold: true, size: 11 });
  draw(COMPANY_LINE2, { size: 9 });
  y -= 12;
  draw(`Quote #: ${opts.quoteNumber}`, { bold: true });
  draw(`Date: ${opts.dateStr}`);
  if (opts.validUntil) draw(`Valid until: ${opts.validUntil}`);
  y -= 10;
  draw("Bill to:", { bold: true });
  draw(opts.billTo.company);
  draw(opts.billTo.contact);
  draw(opts.billTo.email);
  y -= 14;
  draw("Description", { bold: true, size: 9 });
  page.drawText("Qty", { x: 320, y + 14, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
  page.drawText("Unit ZAR", { x: 380, y + 14, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
  page.drawText("Line ZAR", { x: 470, y + 14, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
  y -= 6;
  for (const line of opts.lines) {
    const desc = line.description.length > 60 ? line.description.slice(0, 57) + "…" : line.description;
    draw(desc, { size: 9 });
    page.drawText(line.qty, { x: 320, y + 13, size: 9, font, color: rgb(0.2, 0.2, 0.22) });
    page.drawText(line.unit, { x: 380, y + 13, size: 9, font, color: rgb(0.2, 0.2, 0.22) });
    page.drawText(line.lineTotal, { x: 470, y + 13, size: 9, font, color: rgb(0.2, 0.2, 0.22) });
    y -= 4;
  }
  y -= 10;
  draw(`Subtotal: R ${opts.subtotal}`, { size: 10 });
  draw(`VAT: R ${opts.tax}`, { size: 10 });
  draw(`Total: R ${opts.total}`, { bold: true, size: 12 });

  return pdf.save();
}

async function buildInvoicePdf(opts: {
  invoiceNumber: string;
  dateStr: string;
  dueDate: string | null;
  billTo: { company: string; contact: string; email: string };
  lines: { description: string; qty: string; unit: string; lineTotal: string }[];
  subtotal: string;
  tax: string;
  total: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const left = 50;
  let y = 800;
  y = await drawBrandLogoOnPage(pdf, page, left, y);
  const draw = (text: string, o: { bold?: boolean; size?: number } = {}) => {
    const f = o.bold ? fontBold : font;
    const size = o.size ?? 10;
    page.drawText(text, { x: left, y, size, font: f, color: rgb(0.1, 0.1, 0.12) });
    y -= size + 4;
  };

  draw("TAX INVOICE", { bold: true, size: 18 });
  y -= 6;
  draw(COMPANY, { bold: true, size: 11 });
  draw(COMPANY_LINE2, { size: 9 });
  y -= 12;
  draw(`Invoice #: ${opts.invoiceNumber}`, { bold: true });
  draw(`Date: ${opts.dateStr}`);
  if (opts.dueDate) draw(`Due: ${opts.dueDate}`);
  y -= 10;
  draw("Bill to:", { bold: true });
  draw(opts.billTo.company);
  draw(opts.billTo.contact);
  draw(opts.billTo.email);
  y -= 14;
  draw("Description", { bold: true, size: 9 });
  page.drawText("Qty", { x: 320, y + 14, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
  page.drawText("Unit ZAR", { x: 380, y + 14, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
  page.drawText("Line ZAR", { x: 470, y + 14, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
  y -= 6;
  for (const line of opts.lines) {
    const desc = line.description.length > 60 ? line.description.slice(0, 57) + "…" : line.description;
    draw(desc, { size: 9 });
    page.drawText(line.qty, { x: 320, y + 13, size: 9, font, color: rgb(0.2, 0.2, 0.22) });
    page.drawText(line.unit, { x: 380, y + 13, size: 9, font, color: rgb(0.2, 0.2, 0.22) });
    page.drawText(line.lineTotal, { x: 470, y + 13, size: 9, font, color: rgb(0.2, 0.2, 0.22) });
    y -= 4;
  }
  y -= 10;
  draw(`Subtotal: R ${opts.subtotal}`, { size: 10 });
  draw(`VAT: R ${opts.tax}`, { size: 10 });
  draw(`Total due: R ${opts.total}`, { bold: true, size: 12 });

  return pdf.save();
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Body = { type?: string; id?: string; recipient_email?: string };

const CRM_COMMERCIAL_DOC_ROLES = new Set([
  "admin",
  "production_manager",
  "sales",
  "quality_officer",
]);

function isValidEmail(s: string): boolean {
  const t = s.trim();
  return t.length > 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function resolveRecipient(requested: string | undefined, fallback: string): string {
  if (requested && isValidEmail(requested)) return requested.trim();
  return fallback.trim();
}

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return bad("method_not_allowed", 405);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const resendFrom = Deno.env.get("RESEND_FROM");

  if (!resendKey || !resendFrom) {
    return bad("email_not_configured", 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return bad("unauthorized", 401);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }

  const docType = body.type === "invoice" ? "invoice" : body.type === "quote" ? "quote" : null;
  const id = typeof body.id === "string" ? body.id : "";
  if (!docType || !id) {
    return bad("invalid_body");
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    return bad("unauthorized", 401);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  const role = profile?.role as string | undefined;
  if (!role || !CRM_COMMERCIAL_DOC_ROLES.has(role)) {
    return bad("forbidden", 403);
  }

  if (docType === "quote") {
    const { data: quote, error: qe } = await admin.from("quotes").select("*").eq("id", id).maybeSingle();
    if (qe || !quote) {
      return bad("quote_not_found", 404);
    }

    const { data: qr } = await admin
      .from("quote_requests")
      .select("*")
      .eq("id", quote.quote_request_id)
      .maybeSingle();

    const { data: lines } = await admin
      .from("quote_lines")
      .select("*")
      .eq("quote_id", id)
      .order("position", { ascending: true });

    const fallbackEmail =
      String(quote.customer_email_snapshot ?? "") ||
      String(qr?.email ?? "") ||
      "";
    const email = resolveRecipient(body.recipient_email, fallbackEmail);
    if (!email) {
      return bad("missing_customer_email", 400);
    }

    const company = quote.customer_company_snapshot || qr?.company_name || "";
    const contact = quote.customer_contact_snapshot || qr?.contact_name || "";
    const subtotal = Number(quote.subtotal_zar ?? 0);
    const tax = Number(quote.tax_zar ?? 0);
    const total = Number(quote.total_zar ?? 0);

    const pdfBytes = await buildQuotePdf({
      quoteNumber: quote.quote_number as string,
      dateStr: new Date(quote.created_at as string).toLocaleDateString("en-ZA"),
      validUntil: quote.valid_until
        ? new Date(quote.valid_until as string).toLocaleDateString("en-ZA")
        : null,
      billTo: { company, contact, email },
      lines: (lines ?? []).map((l: Record<string, unknown>) => ({
        description: String(l.description ?? ""),
        qty: String(l.qty ?? "0"),
        unit: fmtMoney(Number(l.unit_price_zar ?? 0)),
        lineTotal: fmtMoney(Number(l.line_total_zar ?? 0)),
      })),
      subtotal: fmtMoney(subtotal),
      tax: fmtMoney(tax),
      total: fmtMoney(total),
    });

    const path = `quotes/${id}.pdf`;
    const { error: upErr } = await admin.storage.from("commercial-docs").upload(path, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) {
      console.error(upErr);
      return bad("upload_failed", 500);
    }

    const b64 = bytesToBase64(pdfBytes);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [email],
        subject: `Quotation ${quote.quote_number} — ${COMPANY}`,
        html: `<p>Dear ${contact || "customer"},</p><p>Please find your quotation <strong>${quote.quote_number}</strong> attached (PDF).</p><p>Kind regards,<br/>${COMPANY}</p>`,
        attachments: [{ filename: `${quote.quote_number}.pdf`, content: b64 }],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("resend", t);
      return bad("email_failed", 502);
    }

    await admin
      .from("quotes")
      .update({ status: "sent", pdf_path: path })
      .eq("id", id);

    await admin
      .from("quote_requests")
      .update({ status: "quoted" })
      .eq("id", quote.quote_request_id)
      .in("status", ["submitted", "reviewing"]);

    return new Response(JSON.stringify({ ok: true, pdf_path: path }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // invoice
  const { data: inv, error: ie } = await admin.from("invoices").select("*").eq("id", id).maybeSingle();
  if (ie || !inv) {
    return bad("invoice_not_found", 404);
  }

  const { data: quote } = await admin.from("quotes").select("*").eq("id", inv.quote_id).maybeSingle();
  const { data: qr2 } = quote
    ? await admin.from("quote_requests").select("*").eq("id", quote.quote_request_id).maybeSingle()
    : { data: null };

  const { data: invLines } = await admin
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", id)
    .order("position", { ascending: true });

  const fallbackEmailInv =
    String(inv.customer_email_snapshot ?? "") ||
    String(quote?.customer_email_snapshot ?? "") ||
    String(qr2?.email ?? "") ||
    "";
  const email = resolveRecipient(body.recipient_email, fallbackEmailInv);
  if (!email) {
    return bad("missing_customer_email", 400);
  }

  const company = inv.customer_company_snapshot || quote?.customer_company_snapshot || qr2?.company_name || "";
  const contact = inv.customer_contact_snapshot || quote?.customer_contact_snapshot || qr2?.contact_name || "";
  const subtotal = Number(inv.subtotal_zar ?? 0);
  const tax = Number(inv.tax_zar ?? 0);
  const total = Number(inv.total_zar ?? 0);

  const pdfBytes = await buildInvoicePdf({
    invoiceNumber: inv.invoice_number as string,
    dateStr: new Date(inv.created_at as string).toLocaleDateString("en-ZA"),
    dueDate: inv.due_date ? new Date(inv.due_date as string).toLocaleDateString("en-ZA") : null,
    billTo: { company, contact, email },
    lines: (invLines ?? []).map((l: Record<string, unknown>) => ({
      description: String(l.description ?? ""),
      qty: String(l.qty ?? "0"),
      unit: fmtMoney(Number(l.unit_price_zar ?? 0)),
      lineTotal: fmtMoney(Number(l.line_total_zar ?? 0)),
    })),
    subtotal: fmtMoney(subtotal),
    tax: fmtMoney(tax),
    total: fmtMoney(total),
  });

  const path = `invoices/${id}.pdf`;
  const { error: upErr2 } = await admin.storage.from("commercial-docs").upload(path, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upErr2) {
    console.error(upErr2);
    return bad("upload_failed", 500);
  }

  const b64 = bytesToBase64(pdfBytes);
  const res2 = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [email],
      subject: `Invoice ${inv.invoice_number} — ${COMPANY}`,
      html: `<p>Dear ${contact || "customer"},</p><p>Please find invoice <strong>${inv.invoice_number}</strong> attached (PDF).</p><p>Kind regards,<br/>${COMPANY}</p>`,
      attachments: [{ filename: `${inv.invoice_number}.pdf`, content: b64 }],
    }),
  });

  if (!res2.ok) {
    const t = await res2.text();
    console.error("resend", t);
    return bad("email_failed", 502);
  }

  await admin.from("invoices").update({ status: "sent", pdf_path: path }).eq("id", id);

  if (quote?.quote_request_id) {
    await admin
      .from("quote_requests")
      .update({ status: "invoiced" })
      .eq("id", quote.quote_request_id);
  }

  return new Response(JSON.stringify({ ok: true, pdf_path: path }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
