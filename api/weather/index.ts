import * as http from "node:http";
import { fetchRemMeasurements } from "../../lib/remIngest.js";
import {
  getPool,
  queryLatestSnapshot,
  upsertReadings,
} from "../../lib/weatherRepo.js";

// Value import from node:http keeps the handler compatible with Vercel’s file tracer.
void http;

function isVercelDeployment(): boolean {
  return (
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  );
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }
  try {
    // REM is reachable from many home networks but often not from Vercel → use Postgres cache.
    if (isVercelDeployment()) {
      if (!process.env.DATABASE_URL?.trim()) {
        console.error("api/weather: DATABASE_URL missing on Vercel");
        return res.status(503).json({
          error:
            "DATABASE_URL is not set. Add your Supabase pooler connection string under Vercel → Project → Settings → Environment Variables.",
        });
      }
      try {
        const pool = getPool();
        const data = await queryLatestSnapshot(pool);
        if (!Array.isArray(data) || data.length === 0) {
          return res.status(503).json({
            error:
              "No cached weather data yet. Run the app locally once (`npm run dev`) with DATABASE_URL so /api/weather can ingest REM into Supabase, then redeploy or wait for the next request.",
          });
        }
        return res.status(200).json(data);
      } catch (dbErr) {
        console.error("api/weather: snapshot read failed:", dbErr);
        return res.status(503).json({
          error:
            "Could not read cached weather from the database. Verify DATABASE_URL, SSL, and that public.weather_readings exists (see supabase/migrations).",
        });
      }
    }

    const data = await fetchRemMeasurements();
    try {
      const pool = getPool();
      await upsertReadings(pool, data, new Date());
    } catch (persistErr) {
      console.error("Weather DB persist error:", persistErr);
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(500).json({ error: "Failed to fetch weather data" });
  }
}

export const config = { runtime: "nodejs" };
