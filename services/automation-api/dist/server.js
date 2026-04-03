import Fastify from "fastify";
import cors from "@fastify/cors";
import { verifyRequestAuth } from "./auth.js";
import { aggregateOee, getLatestByMachine, getSeries, insertSnapshots, } from "./db.js";
import { getSimulatorMachines, runSimulatorTick } from "./simulator.js";
async function main() {
    const port = Number(process.env.PORT ?? 4000);
    const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
    const simEnabled = process.env.SIMULATOR_ENABLED !== "false";
    const app = Fastify({ logger: true });
    await app.register(cors, { origin: corsOrigin, credentials: true });
    app.addHook("onRequest", async (req) => {
        const path = req.url.split("?")[0];
        if (path?.startsWith("/v1/stream/")) {
            const q = req.url.includes("?") ? req.url.slice(req.url.indexOf("?") + 1) : "";
            const token = new URLSearchParams(q).get("access_token");
            if (token && !req.headers.authorization) {
                req.headers.authorization = `Bearer ${token}`;
            }
        }
    });
    app.addHook("preHandler", async (req, reply) => {
        const path = req.url.split("?")[0];
        if (path === "/health")
            return;
        const auth = await verifyRequestAuth(req);
        if (!auth.ok) {
            return reply.status(401).send({ error: auth.error });
        }
        req.automationUserId = auth.userId;
    });
    app.get("/health", async () => ({ ok: true }));
    app.post("/v1/ingest/machine-snapshot", async (req, reply) => {
        const points = req.body?.points;
        if (!Array.isArray(points) || points.length === 0) {
            return reply.status(400).send({ error: "points array required" });
        }
        await insertSnapshots(points);
        return { inserted: points.length };
    });
    app.get("/v1/machines", async () => {
        const latest = await getLatestByMachine();
        return { machines: latest };
    });
    app.get("/v1/machines/:id/series", async (req, reply) => {
        const to = req.query.to ? new Date(req.query.to) : new Date();
        const from = req.query.from
            ? new Date(req.query.from)
            : new Date(to.getTime() - 6 * 60 * 60 * 1000);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
            return reply.status(400).send({ error: "invalid date range" });
        }
        const series = await getSeries(req.params.id, from.toISOString(), to.toISOString());
        return {
            machine_id: req.params.id,
            from: from.toISOString(),
            to: to.toISOString(),
            series,
        };
    });
    app.get("/v1/metrics/oee", async (req, reply) => {
        const to = req.query.to ? new Date(req.query.to) : new Date();
        const from = req.query.from
            ? new Date(req.query.from)
            : new Date(to.getTime() - 24 * 60 * 60 * 1000);
        const oee = await aggregateOee(from.toISOString(), to.toISOString());
        return { from: from.toISOString(), to: to.toISOString(), oee_pct: oee };
    });
    app.get("/v1/stream/machines", async (req, reply) => {
        reply.hijack();
        reply.raw.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": corsOrigin,
        });
        const send = (data) => {
            reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        const interval = setInterval(async () => {
            try {
                const latest = await getLatestByMachine();
                send({ t: new Date().toISOString(), machines: latest });
            }
            catch (e) {
                app.log.error(e);
            }
        }, 5000);
        req.raw.on("close", () => clearInterval(interval));
        send({ machines: await getLatestByMachine() });
        return reply;
    });
    if (simEnabled) {
        setInterval(() => {
            runSimulatorTick().catch((e) => app.log.error(e));
        }, 5000);
        app.log.info("Simulator enabled: writing metrics every 5s");
    }
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info({ port, machines: getSimulatorMachines().map((m) => m.id) }, "automation-api listening");
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
