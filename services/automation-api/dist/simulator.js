import { createClient } from "@supabase/supabase-js";
import { insertSnapshots } from "./db.js";
const MACHINES = [
    { id: "loom-A1", type: "loom", baseRpm: 210 },
    { id: "loom-A2", type: "loom", baseRpm: 195 },
    { id: "knit-K3", type: "knitting", baseRpm: 120 },
    { id: "dye-D1", type: "dyeing", baseRpm: 0 },
];
const state = new Map();
function rng(seed) {
    let s = seed % 2147483647;
    if (s <= 0)
        s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const rand = rng(42);
function initState(id) {
    if (!state.has(id)) {
        state.set(id, {
            running: true,
            phase: 0,
            produced_m: 800 + rand() * 400,
            produced_kg: 120 + rand() * 60,
            downtimeAccumulator: 0,
        });
    }
}
MACHINES.forEach((m) => initState(m.id));
let tickCount = 0;
let supabaseAdmin = null;
function getSupabaseAdmin() {
    if (supabaseAdmin)
        return supabaseAdmin;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
        return null;
    supabaseAdmin = createClient(url, key);
    return supabaseAdmin;
}
async function emitSupabaseEvent(eventType, message, meta) {
    const sb = getSupabaseAdmin();
    if (!sb)
        return;
    await sb.from("automation_events").insert({
        event_type: eventType,
        message,
        meta,
    });
}
export async function runSimulatorTick() {
    const now = new Date().toISOString();
    const batch = [];
    for (const m of MACHINES) {
        initState(m.id);
        const st = state.get(m.id);
        st.phase += 0.08;
        if (rand() < 0.02)
            st.running = !st.running;
        if (!st.running) {
            st.downtimeAccumulator += 5;
            if (st.downtimeAccumulator >= 900 && rand() < 0.3) {
                st.downtimeAccumulator = 0;
                void emitSupabaseEvent("machine_alarm", `${m.id} downtime exceeded 15 minutes — maintenance ticket suggested`, { machine_id: m.id, machine_type: m.type });
            }
        }
        else {
            st.downtimeAccumulator = 0;
        }
        const rpm = st.running
            ? m.baseRpm * (0.92 + rand() * 0.12) + Math.sin(st.phase) * 4
            : 0;
        const efficiency = st.running
            ? Math.min(99, 72 + rand() * 22 + Math.sin(st.phase * 0.7) * 6)
            : 0;
        const temp = m.type === "dyeing"
            ? st.running
                ? 82 + rand() * 10 + Math.sin(st.phase) * 2
                : 45 + rand() * 5
            : null;
        if (st.running) {
            st.produced_m += (rpm / 60) * 5 * 0.02;
            st.produced_kg += rand() * 0.4;
        }
        batch.push({
            time: now,
            machine_id: m.id,
            machine_type: m.type,
            rpm: Math.round(rpm * 10) / 10,
            efficiency_pct: Math.round(efficiency * 10) / 10,
            temperature_c: temp !== null ? Math.round(temp * 10) / 10 : null,
            running: st.running,
            produced_length_m: Math.round(st.produced_m * 100) / 100,
            produced_weight_kg: Math.round(st.produced_kg * 100) / 100,
            shift_id: "shift-1",
        });
    }
    await insertSnapshots(batch);
    tickCount += 1;
    if (tickCount % 6 === 0) {
        const ex = getSupabaseAdmin();
        if (ex) {
            const kg = 400 + Math.round(rand() * 120);
            await emitSupabaseEvent("inventory_automation", `Raw cotton received — ${kg} kg (weighbridge @ ${new Date().toISOString().slice(11, 19)})`, { source: "simulator", kg });
        }
    }
    if (tickCount % 8 === 0) {
        const roll = 200 + Math.floor(rand() * 80);
        await emitSupabaseEvent("inventory_automation", `Finished roll #${roll} scanned out for shipping`, { source: "simulator", roll });
    }
    if (tickCount % 10 === 0) {
        await emitSupabaseEvent("workflow", `Quality passed → auto-created shipping task #SH-${100 + (tickCount % 50)} (simulated)`, { source: "simulator" });
    }
    return batch;
}
export function getSimulatorMachines() {
    return MACHINES;
}
