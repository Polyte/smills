import { loadEnv } from "vite";
import { handleRfidApi } from "./rfid-api-handler.mjs";

/**
 * Vite dev server: same-origin POST http://localhost:5173/api/rfid
 */
export function viteRfidApiPlugin() {
  return {
    name: "vite-plugin-rfid-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (url !== "/api/rfid") {
          next();
          return;
        }
        const mode = server.config.mode;
        const loaded = loadEnv(mode, process.cwd(), "");
        const merged = { ...process.env, ...loaded };
        void handleRfidApi(req, res, merged).catch((err) => {
          if (!res.writableEnded) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: String(err) }));
          }
        });
      });
    },
  };
}
