/**
 * Shared RFID ingest: POST /api/rfid
 * Validates RFID_DEVICE_SECRET, calls Supabase workforce_apply_access_event (service role).
 */
import { createClient } from "@supabase/supabase-js";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function pathnameOnly(url) {
  if (!url) return "/";
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {Promise<void>}
 */
export async function handleRfidApi(req, res, env = process.env) {
  const sendJson = (status, obj) => {
    if (res.writableEnded) return;
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() });
    res.end(JSON.stringify(obj));
  };

  const path = pathnameOnly(req.url);
  if (path !== "/api/rfid") {
    res.writeHead(404, { "Content-Type": "application/json", ...corsHeaders() });
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.method === "GET") {
    return sendJson(200, {
      ok: true,
      service: "rfid-ingest",
      methods: ["POST"],
      body: {
        readerKey: "string (access_readers.reader_key)",
        rfidUid: "string (workforce_employees.rfid_uid)",
        clientTs: "optional ISO-8601",
        deviceMeta: "optional object",
      },
      auth: "Authorization: Bearer <RFID_DEVICE_SECRET>",
    });
  }

  if (req.method !== "POST") {
    return sendJson(405, { ok: false, error: "method_not_allowed" });
  }

  const secret = env.RFID_DEVICE_SECRET;
  const auth = req.headers.authorization;
  if (!secret || auth !== `Bearer ${secret}`) {
    return sendJson(401, { ok: false, error: "unauthorized" });
  }

  let body;
  try {
    const raw = await readBody(req);
    body = JSON.parse(raw || "{}");
  } catch {
    return sendJson(400, { ok: false, error: "invalid_json" });
  }

  if (typeof body.readerKey !== "string" || typeof body.rfidUid !== "string") {
    return sendJson(400, { ok: false, error: "invalid_body" });
  }

  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim() || !serviceKey?.trim()) {
    return sendJson(500, { ok: false, error: "server_misconfigured_missing_supabase_service" });
  }

  const supabase = createClient(url.trim(), serviceKey.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("workforce_apply_access_event", {
    p_reader_key: body.readerKey,
    p_rfid_uid: body.rfidUid,
    p_occurred_at: body.clientTs ?? null,
    p_device_meta: body.deviceMeta ?? null,
  });

  if (error) {
    return sendJson(500, { ok: false, error: error.message });
  }

  const row = data;
  const ok = row?.ok === true;
  return sendJson(ok ? 200 : 400, row ?? { ok: false, error: "empty_response" });
}
