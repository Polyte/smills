/**
 * Links this repo to your Supabase project and applies migrations in supabase/migrations/.
 * Requires SUPABASE_DB_PASSWORD in .env (Dashboard → Project Settings → Database → Database password).
 * The anon key cannot run DDL; this uses the Supabase CLI + Postgres password.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

loadEnv();

const pass = process.env.SUPABASE_DB_PASSWORD;
const rawUrl = process.env.VITE_SUPABASE_URL?.trim();
const refFromEnv = process.env.SUPABASE_PROJECT_REF?.trim();
/** Hosted project ref is the subdomain: https://<ref>.supabase.co (alphanumeric, ~20 chars). */
function refFromHostedUrl(url) {
  if (!url) return undefined;
  const u = url.replace(/\/+$/, "");
  const m = u.match(/^https:\/\/([a-z0-9]+)\.supabase\.co$/i);
  if (!m) return undefined;
  const sub = m[1];
  if (sub.length < 15) return undefined;
  return sub;
}
const refFromUrl = refFromHostedUrl(rawUrl);
const ref = refFromEnv || refFromUrl;

if (!pass) {
  console.error(
    "Missing SUPABASE_DB_PASSWORD.\n" +
      "1. Open Supabase → Project Settings → Database.\n" +
      "2. Copy or reset the Database password (not the anon key).\n" +
      "3. Add to .env:\n" +
      "   SUPABASE_DB_PASSWORD=your-database-password\n" +
      "4. Run: npm run db:push"
  );
  process.exit(1);
}

if (!ref) {
  const hintLocal =
    rawUrl &&
    /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(rawUrl);
  console.error(
    "Could not infer hosted Supabase project ref.\n\n" +
      "For cloud (npm run db:push), add to .env or .env.local:\n" +
      "  • VITE_SUPABASE_URL=https://<project-ref>.supabase.co\n" +
      "    (Dashboard → Project Settings → API → Project URL)\n" +
      "  • or set SUPABASE_PROJECT_REF=<project-ref> explicitly\n\n" +
      (hintLocal
        ? "You are using a local API URL (127.0.0.1 / localhost). That URL has no cloud project ref.\n" +
          "Either set SUPABASE_PROJECT_REF to your hosted project ref, or use local migrations:\n" +
          "  npm run supabase:start && npm run db:local:reset\n\n"
        : rawUrl?.includes("your-project")
          ? "Replace placeholder your-project in VITE_SUPABASE_URL with your real project ref.\n\n"
          : !rawUrl
            ? "VITE_SUPABASE_URL is not set.\n\n"
            : "") +
      "Project ref looks like 20 lowercase letters/digits in the dashboard URL:\n" +
      "  https://supabase.com/dashboard/project/<project-ref>"
  );
  process.exit(1);
}

const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
const common = { cwd: root, stdio: "inherit", shell: true };

const link = spawnSync(
  npxCmd,
  ["supabase@latest", "link", "--project-ref", ref, "--password", pass, "--yes"],
  common
);
if (link.status !== 0) {
  process.exit(link.status ?? 1);
}

/** Pass-through for Supabase CLI, e.g. `npm run db:push -- --include-all` */
const passthrough = process.argv.slice(2);
const push = spawnSync(
  npxCmd,
  ["supabase@latest", "db", "push", "--yes", ...passthrough],
  common
);
process.exit(push.status ?? 0);
