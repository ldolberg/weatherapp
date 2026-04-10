import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cron from "node-cron";
import { fetchRemMeasurements } from "./lib/remIngest.ts";
import { getPool, queryHistory, upsertReadings } from "./lib/weatherRepo.ts";

const DEFAULT_CRON = "*/5 * * * *";

function cronEnabled(): boolean {
  return process.env.WEATHER_CRON_ENABLED !== "false";
}

function cronExpression(): string {
  const expr = process.env.WEATHER_CRON?.trim();
  return expr && expr.length > 0 ? expr : DEFAULT_CRON;
}

async function ingestFromRem(): Promise<void> {
  const pool = getPool();
  const data = await fetchRemMeasurements();
  await upsertReadings(pool, data, new Date());
}

async function startServer() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required (Supabase pooler URI).");
    process.exit(1);
  }

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Warm pool at startup (fail fast if URL is wrong)
  try {
    getPool();
  } catch (e) {
    console.error("Postgres pool error:", e);
    process.exit(1);
  }

  app.get("/api/weather", async (_req, res) => {
    try {
      const data = await fetchRemMeasurements();
      try {
        const pool = getPool();
        await upsertReadings(pool, data, new Date());
      } catch (persistErr) {
        console.error("Weather DB persist error:", persistErr);
      }
      res.json(data);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: "Failed to fetch weather data" });
    }
  });

  app.get("/api/weather/history", async (req, res) => {
    try {
      const pool = getPool();
      const stationId = req.query.stationId;
      if (typeof stationId !== "string" || !stationId.trim()) {
        res.status(400).json({ error: "Missing or invalid stationId" });
        return;
      }
      const limitRaw = req.query.limit;
      const limit =
        typeof limitRaw === "string" ? parseInt(limitRaw, 10) || 200 : 200;
      const since =
        typeof req.query.since === "string" && req.query.since.trim()
          ? req.query.since.trim()
          : undefined;
      const readings = await queryHistory(pool, {
        stationId: stationId.trim(),
        limit,
        since,
      });
      res.json({ readings });
    } catch (e) {
      console.error("History query error:", e);
      res.status(500).json({ error: "Failed to read history" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("Weather DB: Supabase Postgres (DATABASE_URL)");
    if (cronEnabled()) {
      const expr = cronExpression();
      if (!cron.validate(expr)) {
        console.error(`Invalid WEATHER_CRON expression: ${expr}`);
      } else {
        cron.schedule(expr, () => {
          ingestFromRem().catch((err) =>
            console.error("Scheduled weather ingest error:", err)
          );
        });
        console.log(`Weather cron enabled: ${expr}`);
      }
    } else {
      console.log("Weather cron disabled (WEATHER_CRON_ENABLED=false)");
    }
  });
}

startServer();
