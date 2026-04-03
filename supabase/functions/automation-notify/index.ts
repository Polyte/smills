/**
 * Webhook-style notifier for automation events (optional).
 * Call from database webhook, cron, or client after critical actions.
 *
 * Secrets: RESEND_API_KEY, RESEND_FROM, AUTOMATION_NOTIFY_EMAIL (comma-separated)
 */
import { Resend } from "npm:resend@4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!authHeader.startsWith("Bearer ") || authHeader.slice(7) !== serviceKey) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const body = (await req.json()) as { subject?: string; html?: string };
    const key = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM");
    const toRaw = Deno.env.get("AUTOMATION_NOTIFY_EMAIL") ?? "";
    if (!key || !from || !toRaw.trim()) {
      return new Response(JSON.stringify({ ok: false, error: "email not configured" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const resend = new Resend(key);
    const to = toRaw.split(",").map((s) => s.trim()).filter(Boolean);
    await resend.emails.send({
      from,
      to,
      subject: body.subject ?? "Standerton automation alert",
      html: body.html ?? "<p>Automation event</p>",
    });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
