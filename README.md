# Website for Standerton Mills

Public marketing site and embedded CRM with **factory automation** integration.

**Where data lives**

| Layer | Database | Role |
|--------|----------|------|
| **CRM & operations** | **Supabase (PostgreSQL)** | Auth, profiles, contacts, inventory, sales orders, QC, automation rules/events in Postgres + RLS |
| **Machine telemetry** | **TimescaleDB** (Docker) | High-frequency RPM, efficiency, temperature, counters — hypertable `machine_metric_points`, queried only via [`services/automation-api`](./services/automation-api/) (browser never opens Timescale directly) |

Design roots: [Figma — Website for Standerton Mills](https://www.figma.com/design/jphyfLEs36VwOTGG25sHbR/Website-for-Standerton-Mills).

## Prerequisites

- Node 20+ (for the Vite app and optional tooling)
- Docker Desktop (or compatible) for **TimescaleDB + automation API**, and for **local CRM Postgres** (below)
- Supabase project **or** local Supabase (Docker) for CRM auth and relational data

## Local PostgreSQL for the CRM (Supabase CLI)

The CRM uses **Postgres through Supabase’s API** (auth, row-level security, REST). You cannot point the Vite app at a raw `postgres://` URL from the browser. To run a **real local Postgres** with the same schema:

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if you do not have it (`npx` works via the scripts below).
2. From the repo root:
   ```bash
   npm run supabase:start
   npm run supabase:status
   ```
3. Copy **API URL** (`http://127.0.0.1:54321`) and **anon key** into `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Set **`VITE_CRM_USE_SQLITE=false`** (or remove `VITE_CRM_USE_SQLITE=true`).
4. Apply migrations to the local database (destructive reset; use when bootstrapping or after changing migrations):
   ```bash
   npm run db:local:reset
   ```
5. Run `npm run dev` and sign up the first user in the CRM (local Auth).

The database listens on **`localhost:54322`** (see [`supabase/config.toml`](./supabase/config.toml)). Use `npm run supabase:stop` when finished.

For a hosted project instead, keep using cloud `VITE_SUPABASE_*` values (`https://<ref>.supabase.co`, not `127.0.0.1`) and `npm run db:push` with `SUPABASE_DB_PASSWORD`. If `db:push` cannot infer the project ref (e.g. you only have a local URL in `.env`), set **`SUPABASE_PROJECT_REF`** to the ref from the dashboard URL (`/project/<ref>`). See [`.env.example`](./.env.example).

## Frontend (Vite)

```bash
npm install
npm run dev
```

Copy [`.env.example`](./.env.example) to `.env` or `.env.local` and set at least:

- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — anon (public) key
- `VITE_AUTOMATION_API_URL` — **set to `http://localhost:4000`** when Docker Timescale + automation API are running so dashboards and the automation hub load live gauges (without it, CRM still works but machine charts stay empty)

If Supabase env vars are empty, the CRM can fall back to **browser SQLite** (offline demo). Factory tables (sales orders, QC, automation timeline) require Supabase. **Timescale is optional for CRM navigation but required for live machine time-series** (point `VITE_AUTOMATION_API_URL` at your deployed automation API in production).

## Supabase migrations

Apply SQL in [`supabase/migrations/`](./supabase/migrations/) (CLI, dashboard SQL editor, or `npm run db:push` when configured). The **`0010_factory_operations.sql`** migration:

- Replaces CRM roles with `admin | production_manager | sales | quality_officer`
- Adds sales orders, samples, factory work orders, QC, contact logs, automation rules/actions/alerts/events, inventory lots, logistics fields on shipments

The **`0011_storage_contact_qc.sql`** migration registers private Storage buckets **`contact-documents`** and **`qc-defect-photos`** with policies for authenticated CRM users (contact uploads and QC defect images use signed URLs from the app).

The **`0012_standerton_demo_seed.sql`** migration inserts **demo CRM, inventory, sales orders, samples, work orders, QC (with picsum image URLs), automation events, quotes/invoices, shipments, and workforce** rows. It runs only when **`contacts`** has no row named **Demo: Lindela Weavers (Pty) Ltd** and **`profiles`** has at least one user — create one account first, then apply migrations. **Offline SQLite**: clearing site data and signing in again seeds a smaller matching demo set automatically once catalog items exist.

## Docker: Timescale + automation API

From the repo root:

```bash
cp .env.automation.example .env   # or merge into your shell env
docker compose up --build
```

Services:

- **TimescaleDB** on port **5433** (default superuser `tsuser` / DB `factory_ts` — see [`docker-compose.yml`](./docker-compose.yml))
- **automation-api** on port **4000** — REST + SSE for machine metrics; **simulator** writes every **5 seconds** when `SIMULATOR_ENABLED=true`

Point compose env at your Supabase project so the simulator can insert timeline rows:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (for JWT verification on API requests)
- `SUPABASE_SERVICE_ROLE_KEY` (for inserting `automation_events` / related rows)

### Automation API (PLC-shaped)

- `GET /health` — no auth
- `GET /v1/machines` — latest snapshot per machine (Bearer user JWT or `X-Automation-Ingest-Secret` when set)
- `GET /v1/machines/:id/series?from=&to=` — time series
- `GET /v1/metrics/oee` — average efficiency over window
- `POST /v1/ingest/machine-snapshot` — body `{ "points": [ { "machine_id", "machine_type", "rpm", ... } ] }`
- `GET /v1/stream/machines?access_token=<jwt>` — SSE for dashboards (EventSource cannot set headers)

## CRM roles

| Role | Typical use |
|------|----------------|
| `admin` | Full access; only admins may delete automation rules |
| `production_manager` | Inventory, workforce, factory work orders, rules (except delete) |
| `sales` | Pipeline, quotes, customer-facing flows; no workforce nav |
| `quality_officer` | QC inspections, workforce “my attendance” if linked |

## Optional: automation email edge function

[`supabase/functions/automation-notify`](./supabase/functions/automation-notify) sends email via Resend when configured (`RESEND_API_KEY`, `RESEND_FROM`, `AUTOMATION_NOTIFY_EMAIL`). Invoke with `Authorization: Bearer <service_role_key>`.

## Standalone automation service (local dev)

```bash
cd services/automation-api
npm install
TIMESCALE_URL=postgres://tsuser:timescale_dev_password@localhost:5433/factory_ts \
SUPABASE_URL=... SUPABASE_ANON_KEY=... \
npm run dev
```

## Hosted Timescale (any provider)

The browser never connects to Timescale directly; only **automation-api** uses `TIMESCALE_URL`. You can point that at **any** Postgres instance with the Timescale extension (managed Tiger Data, self-hosted TimescaleDB, etc.):

1. **Create the DB** and enable the `timescaledb` extension if the host requires it (follow the provider’s checklist).
2. **Run once:** execute [`services/automation-api/scripts/init-timescale.sql`](./services/automation-api/scripts/init-timescale.sql) in their SQL console or `psql` so `machine_metric_points` and retention exist.
3. **Deploy automation-api** with `TIMESCALE_URL` set (add `?sslmode=require` or stricter SSL query params if the host requires TLS).
4. **Frontend:** set `VITE_AUTOMATION_API_URL` to the public URL of that API (HTTPS in production).

Local Docker Compose keeps using the bundled `timescale` service unless you change compose env yourself; see [`.env.automation.example`](./.env.automation.example) for connection string examples.

## Build for production

```bash
npm run build
```

Static output is written to `dist/`.
