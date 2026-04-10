import * as http from "node:http";
import { fetchRemMeasurements } from "../../lib/remIngest.js";
import {
  getPool,
  queryLatestSnapshot,
  upsertReadings,
} from "../../lib/weatherRepo.js";

/**
 * Vercel bundles API routes with @vercel/nft. Typed handler params, `import type`, and
 * `globalThis as typeof globalThis` in dependencies can prevent tracing `lib/` (runtime
 * ERR_MODULE_NOT_FOUND). Keep `http` imported for Node; leave `req`/`res` untyped.
 */
void http;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }
  try {
    // Live REM works from many home/office networks but often cannot be reached from Vercel
    // (connect timeouts to rem.cba.gov.ar). Serve the latest Postgres snapshot there instead.
    if (process.env.VERCEL === "1") {
      const pool = getPool();
      const data = await queryLatestSnapshot(pool);
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(503).json({
          error:
            "No cached weather data yet. Ingest once from a network that can reach REM (e.g. run `npm run dev` locally) so rows are written to Supabase.",
        });
      }
      return res.status(200).json(data);
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
