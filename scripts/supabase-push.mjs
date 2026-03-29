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
const url = process.env.VITE_SUPABASE_URL;
const refFromEnv = process.env.SUPABASE_PROJECT_REF;
const refFromUrl = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
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
  console.error(
    "Could not infer project ref. Set VITE_SUPABASE_URL or SUPABASE_PROJECT_REF in .env."
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

const push = spawnSync(npxCmd, ["supabase@latest", "db", "push", "--yes"], common);
process.exit(push.status ?? 0);
