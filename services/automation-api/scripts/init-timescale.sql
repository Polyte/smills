-- TimescaleDB hypertable for machine telemetry (first container init only; wipe volume to reapply).
-- CRM / orders / QC stay on Supabase Postgres; this database is mechanical time-series only.

CREATE TABLE IF NOT EXISTS machine_metric_points (
  time TIMESTAMPTZ NOT NULL DEFAULT now(),
  machine_id TEXT NOT NULL,
  machine_type TEXT NOT NULL,
  rpm DOUBLE PRECISION,
  efficiency_pct DOUBLE PRECISION,
  temperature_c DOUBLE PRECISION,
  running BOOLEAN DEFAULT true,
  produced_length_m DOUBLE PRECISION DEFAULT 0,
  produced_weight_kg DOUBLE PRECISION DEFAULT 0,
  shift_id TEXT DEFAULT 'shift-1'
);

SELECT create_hypertable('machine_metric_points', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS machine_metric_points_machine_time_idx
  ON machine_metric_points (machine_id, time DESC);

-- Raw samples older than 30 days are dropped automatically (tune interval in production).
SELECT public.add_retention_policy(
  'machine_metric_points',
  INTERVAL '30 days',
  if_not_exists => TRUE
);
