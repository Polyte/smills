import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const url = process.env.TIMESCALE_URL;
    if (!url) {
      throw new Error("TIMESCALE_URL is required");
    }
    pool = new Pool({ connectionString: url, max: 10 });
  }
  return pool;
}

export type MachineSnapshot = {
  time?: string;
  machine_id: string;
  machine_type: "loom" | "knitting" | "dyeing";
  rpm: number;
  efficiency_pct: number;
  temperature_c: number | null;
  running: boolean;
  produced_length_m: number;
  produced_weight_kg: number;
  shift_id?: string;
};

export async function insertSnapshots(rows: MachineSnapshot[]): Promise<void> {
  if (rows.length === 0) return;
  const client = await getPool().connect();
  try {
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let i = 0;
    for (const r of rows) {
      const t = r.time ?? new Date().toISOString();
      placeholders.push(
        `($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5}, $${i + 6}, $${i + 7}, $${i + 8}, $${i + 9}, $${i + 10})`
      );
      values.push(
        t,
        r.machine_id,
        r.machine_type,
        r.rpm,
        r.efficiency_pct,
        r.temperature_c,
        r.running,
        r.produced_length_m,
        r.produced_weight_kg,
        r.shift_id ?? "shift-1"
      );
      i += 10;
    }
    await client.query(
      `INSERT INTO machine_metric_points (
        time, machine_id, machine_type, rpm, efficiency_pct,
        temperature_c, running, produced_length_m, produced_weight_kg, shift_id
      ) VALUES ${placeholders.join(", ")}`,
      values
    );
  } finally {
    client.release();
  }
}

export async function getLatestByMachine(): Promise<MachineSnapshot[]> {
  const { rows } = await getPool().query(
    `SELECT DISTINCT ON (machine_id)
       machine_id, machine_type, rpm, efficiency_pct,
       temperature_c, running, produced_length_m, produced_weight_kg, shift_id,
       time AS time
     FROM machine_metric_points
     ORDER BY machine_id, time DESC`
  );
  return rows as MachineSnapshot[];
}

export async function getSeries(
  machineId: string,
  fromIso: string,
  toIso: string
): Promise<MachineSnapshot[]> {
  const { rows } = await getPool().query(
    `SELECT time, machine_id, machine_type, rpm, efficiency_pct,
            temperature_c, running, produced_length_m, produced_weight_kg, shift_id
     FROM machine_metric_points
     WHERE machine_id = $1 AND time >= $2::timestamptz AND time <= $3::timestamptz
     ORDER BY time ASC`,
    [machineId, fromIso, toIso]
  );
  return rows as MachineSnapshot[];
}

export async function aggregateOee(fromIso: string, toIso: string): Promise<number> {
  const { rows } = await getPool().query(
    `SELECT COALESCE(AVG(efficiency_pct), 0)::float8 AS oee
     FROM machine_metric_points
     WHERE time >= $1::timestamptz AND time <= $2::timestamptz
       AND running = true`,
    [fromIso, toIso]
  );
  return Number(rows[0]?.oee ?? 0);
}
