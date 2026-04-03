-- Timescale hypertable for machine telemetry (runs on first DB init in Docker).

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
