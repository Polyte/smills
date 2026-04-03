import pg from "pg";
const { Pool } = pg;
let pool = null;
export function getPool() {
    if (!pool) {
        const url = process.env.TIMESCALE_URL;
        if (!url) {
            throw new Error("TIMESCALE_URL is required");
        }
        pool = new Pool({ connectionString: url, max: 10 });
    }
    return pool;
}
export async function insertSnapshots(rows) {
    if (rows.length === 0)
        return;
    const client = await getPool().connect();
    try {
        const values = [];
        const placeholders = [];
        let i = 0;
        for (const r of rows) {
            const t = r.time ?? new Date().toISOString();
            placeholders.push(`($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5}, $${i + 6}, $${i + 7}, $${i + 8}, $${i + 9}, $${i + 10})`);
            values.push(t, r.machine_id, r.machine_type, r.rpm, r.efficiency_pct, r.temperature_c, r.running, r.produced_length_m, r.produced_weight_kg, r.shift_id ?? "shift-1");
            i += 10;
        }
        await client.query(`INSERT INTO machine_metric_points (
        time, machine_id, machine_type, rpm, efficiency_pct,
        temperature_c, running, produced_length_m, produced_weight_kg, shift_id
      ) VALUES ${placeholders.join(", ")}`, values);
    }
    finally {
        client.release();
    }
}
export async function getLatestByMachine() {
    const { rows } = await getPool().query(`SELECT DISTINCT ON (machine_id)
       machine_id, machine_type, rpm, efficiency_pct,
       temperature_c, running, produced_length_m, produced_weight_kg, shift_id,
       time AS time
     FROM machine_metric_points
     ORDER BY machine_id, time DESC`);
    return rows;
}
export async function getSeries(machineId, fromIso, toIso) {
    const { rows } = await getPool().query(`SELECT time, machine_id, machine_type, rpm, efficiency_pct,
            temperature_c, running, produced_length_m, produced_weight_kg, shift_id
     FROM machine_metric_points
     WHERE machine_id = $1 AND time >= $2::timestamptz AND time <= $3::timestamptz
     ORDER BY time ASC`, [machineId, fromIso, toIso]);
    return rows;
}
export async function aggregateOee(fromIso, toIso) {
    const { rows } = await getPool().query(`SELECT COALESCE(AVG(efficiency_pct), 0)::float8 AS oee
     FROM machine_metric_points
     WHERE time >= $1::timestamptz AND time <= $2::timestamptz
       AND running = true`, [fromIso, toIso]);
    return Number(rows[0]?.oee ?? 0);
}
