import { createClient } from "@supabase/supabase-js";
export async function verifyRequestAuth(req) {
    const ingestSecret = process.env.AUTOMATION_INGEST_SECRET;
    const ingestHeader = req.headers["x-automation-ingest-secret"];
    if (ingestSecret &&
        typeof ingestHeader === "string" &&
        ingestHeader === ingestSecret) {
        return { ok: true, userId: "ingest-service" };
    }
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
        return { ok: false, error: "missing_bearer" };
    }
    const token = auth.slice(7);
    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY;
    if (!url || !anon) {
        return { ok: false, error: "supabase_env_missing" };
    }
    const supabase = createClient(url, anon);
    const { data: { user }, error, } = await supabase.auth.getUser(token);
    if (error || !user) {
        return { ok: false, error: error?.message ?? "invalid_token" };
    }
    return { ok: true, userId: user.id };
}
