import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Must match src/lib/quoteProductCatalog.ts */
const ALLOWED_PRODUCT_KEYS = new Set([
  "conveyor-belt-fabrics",
  "mob-head-fabrics",
  "technical-fabrics",
  "woven-industrial-fabrics",
]);

const MAX_LEN = {
  company: 200,
  contact: 200,
  email: 320,
  phone: 64,
  message: 4000,
  uom: 32,
  label: 200,
};

type Body = {
  product_key?: string;
  product_label?: string;
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  message?: string | null;
  quantity?: number | null;
  uom?: string | null;
};

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function emailOk(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= MAX_LEN.email;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return bad("method_not_allowed", 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const defaultOwner = Deno.env.get("QUOTE_DEFAULT_OWNER_ID")?.trim();

  if (!url || !serviceKey || !anonKey) {
    return bad("server_misconfigured", 500);
  }

  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${anonKey}`) {
    return bad("unauthorized", 401);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }

  const product_key = String(body.product_key ?? "").trim();
  const product_label = String(body.product_label ?? "").trim().slice(0, MAX_LEN.label);
  const company_name = String(body.company_name ?? "").trim().slice(0, MAX_LEN.company);
  const contact_name = String(body.contact_name ?? "").trim().slice(0, MAX_LEN.contact);
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim().slice(0, MAX_LEN.phone);
  const message = body.message
    ? String(body.message).trim().slice(0, MAX_LEN.message)
    : null;
  const uom = body.uom ? String(body.uom).trim().slice(0, MAX_LEN.uom) : null;
  const quantity =
    body.quantity != null && Number.isFinite(Number(body.quantity))
      ? Number(body.quantity)
      : null;

  if (!ALLOWED_PRODUCT_KEYS.has(product_key)) {
    return bad("invalid_product");
  }
  if (!company_name || !contact_name) {
    return bad("missing_name");
  }
  if (!emailOk(email)) {
    return bad("invalid_email");
  }
  if (!phone) {
    return bad("missing_phone");
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const assigned_owner_id = defaultOwner && defaultOwner.length > 0 ? defaultOwner : null;

  const { data: ins, error: insErr } = await admin
    .from("quote_requests")
    .insert({
      product_key,
      product_label: product_label || product_key,
      company_name,
      contact_name,
      email,
      phone,
      message,
      quantity,
      uom,
      status: "submitted",
      assigned_owner_id,
    })
    .select("id")
    .maybeSingle();

  if (insErr || !ins?.id) {
    console.error(insErr);
    return bad("insert_failed", 500);
  }

  const requestId = ins.id as string;

  const recipientIds = new Set<string>();
  if (assigned_owner_id) recipientIds.add(assigned_owner_id);

  const { data: managers } = await admin.from("profiles").select("id").eq("role", "manager");
  for (const row of managers ?? []) {
    if (row?.id) recipientIds.add(row.id as string);
  }

  if (recipientIds.size === 0) {
    const { data: anyProfile } = await admin.from("profiles").select("id").limit(1);
    if (anyProfile?.[0]?.id) recipientIds.add(anyProfile[0].id as string);
  }

  const notifications = [...recipientIds].map((user_id) => ({
    user_id,
    kind: "new_quote_request",
    payload: {
      quote_request_id: requestId,
      title: `New quote request: ${product_label || product_key}`,
      company_name,
    },
  }));

  const { error: nErr } = await admin.from("crm_notifications").insert(notifications);
  if (nErr) {
    console.error(nErr);
  }

  const resendKey = Deno.env.get("RESEND_API_KEY")?.trim();
  const resendFrom = Deno.env.get("RESEND_FROM")?.trim();
  const notifyOverride = Deno.env.get("QUOTE_NOTIFY_EMAIL")?.trim();

  if (resendKey && resendFrom) {
    let toAddresses: string[] = [];
    if (notifyOverride) {
      toAddresses = notifyOverride.split(/[,;]/).map((s) => s.trim()).filter((s) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
      );
    } else {
      for (const uid of recipientIds) {
        const { data, error: uErr } = await admin.auth.admin.getUserById(uid);
        if (uErr) {
          console.error("auth_get_user", uid, uErr);
          continue;
        }
        const em = data.user?.email?.trim();
        if (em) toAddresses.push(em);
      }
      toAddresses = [...new Set(toAddresses)];
    }

    if (toAddresses.length > 0) {
      const subject = `New quote request — ${company_name}`;
      const appUrl = Deno.env.get("CRM_APP_URL")?.trim();
      const crmQuotes = appUrl ? `${appUrl.replace(/\/$/, "")}/crm/quotes?request=${requestId}` : null;
      const html = `
<p><strong>New website quote request</strong></p>
<ul>
  <li><strong>Company:</strong> ${escapeHtml(company_name)}</li>
  <li><strong>Contact:</strong> ${escapeHtml(contact_name)}</li>
  <li><strong>Product:</strong> ${escapeHtml(product_label || product_key)}</li>
  <li><strong>Email:</strong> ${escapeHtml(email)}</li>
  <li><strong>Phone:</strong> ${escapeHtml(phone)}</li>
</ul>
${crmQuotes ? `<p><a href="${escapeHtml(crmQuotes)}">Open in CRM</a></p>` : ""}
<p style="color:#666;font-size:12px">Request id: ${escapeHtml(requestId)}</p>`;

      const rSend = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: toAddresses.slice(0, 20),
          subject,
          html,
        }),
      });
      if (!rSend.ok) {
        const errText = await rSend.text().catch(() => "");
        console.error("resend_failed", rSend.status, errText);
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, request_id: requestId }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
