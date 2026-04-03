# Website for Standerton Mills

Public marketing site and embedded CRM with **factory automation** integration (live machine telemetry via a local TimescaleDB API, operational data in Supabase Postgres).

Design roots: [Figma — Website for Standerton Mills](https://www.figma.com/design/jphyfLEs36VwOTGG25sHbR/Website-for-Standerton-Mills).

## Prerequisites

- Node 20+ (for the Vite app and optional tooling)
- Docker Desktop (or compatible) for **TimescaleDB + automation API**
- Supabase project for hosted CRM auth and relational data

## Frontend (Vite)

```bash
npm install
npm run dev
```

Copy [`.env.example`](./.env.example) to `.env` or `.env.local` and set at least:

- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — anon (public) key
- `VITE_AUTOMATION_API_URL` — e.g. `http://localhost:4000` when the automation stack is running

If Supabase env vars are empty, the CRM can fall back to **browser SQLite** (offline demo). Factory tables (sales orders, QC, automation timeline) require Supabase.

## Supabase migrations

Apply SQL in [`supabase/migrations/`](./supabase/migrations/) (CLI, dashboard SQL editor, or `npm run db:push` when configured). The **`0010_factory_operations.sql`** migration:

- Replaces CRM roles with `admin | production_manager | sales | quality_officer`
- Adds sales orders, samples, factory work orders, QC, contact logs, automation rules/actions/alerts/events, inventory lots, logistics fields on shipments

The **`0011_storage_contact_qc.sql`** migration registers private Storage buckets **`contact-documents`** and **`qc-defect-photos`** with policies for authenticated CRM users (contact uploads and QC defect images use signed URLs from the app).

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

## Build for production

```bash
npm run build
```

Static output is written to `dist/`.
