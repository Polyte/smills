/**
 * Standalone HTTP server for POST /api/rfid (production or LAN Arduino).
 * Load env from .env / .env.local via dotenv if installed.
 */
import http from "node:http";
import { handleRfidApi } from "./rfid-api-handler.mjs";

try {
  const { config } = await import("dotenv");
  config({ path: ".env.local" });
  config({ path: ".env" });
} catch {
  /* dotenv optional */
}

/** Default 3001 so it does not clash with Vite dev/preview on 3000. Set RFID_API_PORT=3000 for API-only. */
const port = Number(process.env.RFID_API_PORT || process.env.PORT || 3001);

const server = http.createServer((req, res) => {
  void handleRfidApi(req, res).catch((err) => {
    if (!res.writableEnded) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: String(err) }));
    }
  });
});

server.listen(port, () => {
  console.log(`[rfid-api] listening on http://0.0.0.0:${port}/api/rfid`);
});
